#!/bin/sh
# Smoke test post-cutover (Fase F): golpea la pila completa (nginx -> backend
# NestJS) a traves del mismo camino que usa el navegador, con los usuarios
# sembrados por supabase-setup.sql. Pensado para correr despues de
# `docker compose up -d --build`.
# Uso: sh scripts/smoke-test.sh   (o BASE_URL=http://otro-host sh scripts/smoke-test.sh)
set -u

BASE_URL="${BASE_URL:-http://localhost}"
ADMIN_EMAIL="admin@portalipc.com"
ADMIN_PASSWORD="admin123"

FAILURES=0

pass() {
  echo "  OK   $1"
}

fail() {
  echo "  FAIL $1"
  FAILURES=$((FAILURES + 1))
}

http_code() {
  curl -s -o /dev/null -w '%{http_code}' "$@"
}

echo "Smoke test contra $BASE_URL"

# 1. GET / sirve el shell del frontend (nginx solo proxya /api/ al backend;
# la ruta / del backend en sí no está expuesta al host).
body="$(curl -s "$BASE_URL/")"
if echo "$body" | grep -q '<div id="root">'; then
  pass "GET / sirve el shell del frontend"
else
  fail "GET / no contiene el shell esperado (body: $body)"
fi

# 2. POST /api/login con el admin sembrado devuelve un token
login_body="$(curl -s -X POST "$BASE_URL/api/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")"
token="$(printf '%s' "$login_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)"
if [ -n "$token" ]; then
  pass "POST /api/login (admin) devuelve token"
else
  fail "POST /api/login (admin) no devolvió token (body: $login_body)"
fi

# 3. GET /api/me con ese token incluye el rol superadmin (Fase T: el JWT ya
# no lleva 'admin'/'monitor'/'student' -- esos son roles DE PROYECTO, ver
# ProjectMembership. El admin sembrado es superadmin de plataforma.)
if [ -n "$token" ]; then
  me_body="$(curl -s "$BASE_URL/api/me" -H "Authorization: Bearer $token")"
  if echo "$me_body" | grep -q '"superadmin"'; then
    pass "GET /api/me incluye el rol superadmin"
  else
    fail "GET /api/me no incluye el rol superadmin (body: $me_body)"
  fi
else
  fail "GET /api/me omitido (sin token del paso anterior)"
fi

# 4. Descubrir un projectId real vía /api/projects/mine (Fase O en
# adelante: study-fields/observation-units son project-scoped y devuelven
# 403 sin ?projectId=). Superadmin ve todos los proyectos vía bypass, así
# que alcanza con tomar el primero.
project_id=""
if [ -n "$token" ]; then
  projects_body="$(curl -s "$BASE_URL/api/projects/mine" -H "Authorization: Bearer $token")"
  project_id="$(printf '%s' "$projects_body" | grep -o '"projectId":[0-9]*' | head -1 | cut -d':' -f2)"
  if [ -n "$project_id" ]; then
    pass "GET /api/projects/mine devuelve al menos un proyecto (projectId=$project_id)"
  else
    fail "GET /api/projects/mine no devolvió ningún proyecto (body: $projects_body)"
  fi
else
  fail "GET /api/projects/mine omitido (sin token)"
fi

# 5. Endpoints autenticados devuelven 200
if [ -n "$token" ] && [ -n "$project_id" ]; then
  for path in "/api/study-fields?projectId=$project_id" "/api/observation-units?projectId=$project_id" /api/users; do
    code="$(http_code "$BASE_URL$path" -H "Authorization: Bearer $token")"
    if [ "$code" = "200" ]; then
      pass "GET $path -> 200"
    else
      fail "GET $path -> $code (esperaba 200)"
    fi
  done
else
  fail "Chequeos de endpoints autenticados omitidos (sin token o sin projectId)"
fi

# 6. Rate limiting: dentro de la ventana de 10 intentos, en algún momento
# debe aparecer un 429. No se asume en qué intento exacto ocurre porque el
# throttler cuenta todas las requests a /login (incluido el login exitoso
# del paso 2), no solo las fallidas — igual que rateLimiter.js.
i=1
got_429=0
while [ "$i" -le 15 ] && [ "$got_429" -eq 0 ]; do
  code="$(http_code -X POST "$BASE_URL/api/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"nadie@portalipc.com","password":"incorrecta"}')"
  if [ "$code" = "429" ]; then
    got_429=1
  fi
  i=$((i + 1))
done
if [ "$got_429" -eq 1 ]; then
  pass "rate limiting activo en /api/login (429 tras varios intentos)"
else
  fail "no se observó 429 en /api/login tras 15 intentos"
fi

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "Todos los checks pasaron."
  exit 0
else
  echo "$FAILURES check(s) fallaron."
  exit 1
fi
