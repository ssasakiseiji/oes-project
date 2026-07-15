<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Base de datos (Prisma Migrate)

Desde la Fase G de la migración, el schema de la base lo maneja Prisma
Migrate — no SQL a mano.

### Cambiar el schema

1. Editar `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <descripcion>` — genera y aplica una
   migración nueva contra tu base local, y regenera el client.
3. Commitear la carpeta `prisma/migrations/<timestamp>_<descripcion>/`
   junto con el cambio de schema.

### Deploy

El contenedor del backend corre `prisma migrate deploy` automáticamente al
arrancar (ver `Dockerfile` / script `start:migrate`) — aplica cualquier
migración pendiente y no hace nada si ya están todas aplicadas. Es seguro
que corra en cada restart.

### Adoptar una base EXISTENTE (ej. la Supabase de producción)

La primera vez que esta app se apunte a una base que **ya tiene** el schema
(creada a mano con `supabase-setup.sql` + `inflacion_app_backend/migrations/*.sql`,
de antes de esta fase), hay que decirle a Prisma que la migración baseline
(`0_init`) ya está aplicada, para que no intente recrear tablas existentes:

```bash
DATABASE_URL="<la url real>" npx prisma migrate resolve --applied 0_init
```

Correr esto **una sola vez**, antes del primer deploy del backend nuevo
contra esa base. Si se corre `migrate deploy` sin este paso primero, va a
fallar con "relation already exists".

### Datos de demo/test

`prisma migrate deploy` solo crea el schema, no inserta datos. Para
popular campos de estudio/variables/unidades de observación/usuarios de
prueba:

```bash
npx prisma db seed
```

No se corre automáticamente (ni en `migrate deploy` ni al arrancar el
contenedor) porque son credenciales de test, no algo para insertar en
cualquier entorno sin pensarlo — ver `prisma/seed.ts`.

Siembra 2 proyectos de demo ("Encuesta de Precios" y "Encuesta del
Rally") con memberships mixtas para poder probar el selector de proyecto
del frontend: María es miembro de ambos proyectos (auto-selección con
picker), el resto de los usuarios de un solo proyecto (auto-selección
directa). Credenciales de prueba (mismas de siempre):

| Email | Password | Rol de plataforma | Proyecto(s) |
|---|---|---|---|
| admin@portalipc.com | admin123 | superadmin | todos (bypass implícito) |
| monitor@portalipc.com | monitor123 | — | Encuesta de Precios (monitor) |
| juan@portalipc.com | student123 | — | Encuesta de Precios (student) |
| maria@portalipc.com | student123 | — | Encuesta de Precios + Encuesta del Rally (student) |
| carlos@portalipc.com | student123 | — | Encuesta de Precios (student) |

Tras Fase T, `User.roles` (el JWT) solo puede ser `[]` o `['superadmin']`
— los roles de trabajo (admin/monitor/student) viven en
`ProjectMembership`, por proyecto, no en el usuario global.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
