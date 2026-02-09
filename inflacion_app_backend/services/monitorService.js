import pool from '../config/database.js';

export const monitorService = {
    async getMonitorData() {
        // 1. Fetch all necessary base data in parallel
        const [
            periodsRes,
            studentsRes,
            productsRes,
            allAssignmentsRes, // Fetch current assignments
            pricesRes,          // Fetch ONLY submitted prices
            draftPricesRes,     // Fetch draft prices for "En Proceso" detection
            allCommercesRes    // Fetch all commerce details once
        ] = await Promise.all([
            pool.query('SELECT id, name, status FROM periods ORDER BY year DESC, month DESC'),
            pool.query("SELECT id, name FROM users WHERE 'student' = ANY(roles) ORDER BY name"),
            pool.query('SELECT id FROM products'),
            pool.query('SELECT user_id, commerce_id FROM commerce_assignments'), // Get current assignments
            pool.query(`
                SELECT pr.user_id, pr.commerce_id, pr.period_id, pr.product_id, pr.price
                FROM prices pr
            `),
            pool.query('SELECT user_id, commerce_id, period_id, product_id FROM draft_prices'),
            pool.query('SELECT id, name FROM commerces') // Fetch commerce names
        ]);

        const allPeriods = periodsRes.rows;
        const allStudents = studentsRes.rows;
        const totalProducts = productsRes.rows.length;
        const currentAssignments = allAssignmentsRes.rows;
        const allPrices = pricesRes.rows;
        const allDraftPrices = draftPricesRes.rows;
        // Create a Map for quick commerce name lookup
        const commercesMap = new Map(allCommercesRes.rows.map(c => [c.id, c.name]));

        // 2. Process data for each period
        const monitorDataByPeriod = allPeriods.map(period => {
            const studentProgress = allStudents.map(student => {
                let relevantCommerceIds = new Set();
                let isCurrentPeriodOpen = period.status === 'Open';

                // Always include current assignments so unassigned students appear
                currentAssignments
                    .filter(a => a.user_id === student.id)
                    .forEach(a => relevantCommerceIds.add(a.commerce_id));

                if (!isCurrentPeriodOpen) {
                    // Also include commerces from historical submitted prices
                    // (in case assignments changed since the period was active)
                    allPrices
                        .filter(p => p.period_id === period.id && p.user_id === student.id)
                        .forEach(p => relevantCommerceIds.add(p.commerce_id));
                }

                // Build tasks based on relevant commerces
                const tasks = Array.from(relevantCommerceIds).map(commerceId => {
                    const commerceName = commercesMap.get(commerceId) || `Comercio ID ${commerceId}`; // Get name from map

                    // Filter submitted prices specific to this task
                    const submittedPrices = allPrices.filter(
                        p => p.period_id === period.id && p.user_id === student.id && p.commerce_id === commerceId
                    );

                    // Filter draft prices for this task
                    const draftPricesForTask = allDraftPrices.filter(
                        d => d.period_id === period.id && d.user_id === student.id && d.commerce_id === commerceId
                    );

                    // Determine status: 'Completado' (submitted), 'En Proceso' (drafts), 'Pendiente' (nothing)
                    let status;
                    if (submittedPrices.length > 0) {
                        status = 'Completado';
                    } else if (isCurrentPeriodOpen && draftPricesForTask.length > 0) {
                        status = 'En Proceso';
                    } else {
                        status = 'Pendiente';
                    }

                    // Calculate progress based on submitted prices count
                    const currentProgress = submittedPrices.length;

                    // Calculate completion level for submitted tasks
                    const percentage = totalProducts > 0 ? (currentProgress / totalProducts) * 100 : 0;
                    let completionLevel = null;
                    if (status === 'Completado') {
                        if (percentage < 33) completionLevel = 'bajo';
                        else if (percentage <= 66) completionLevel = 'medio';
                        else completionLevel = 'alto';
                    }

                    // Prepare submitted prices object for potential detail view in frontend
                    const submittedPricesMap = submittedPrices.reduce((acc, p) => {
                        acc[p.product_id] = p.price;
                        return acc;
                    }, {});

                    // Prepare draft prices for detail view
                    const draftPricesMap = draftPricesForTask.reduce((acc, d) => {
                        acc[d.product_id] = d.price;
                        return acc;
                    }, {});

                    return {
                        commerceId: commerceId,
                        commerceName: commerceName,
                        status,
                        completionLevel,
                        progress: {
                            current: currentProgress, // Represents submitted count
                            total: totalProducts      // Always the total number of products expected
                        },
                        // Provide prices for the detail view (RegistrationSummary)
                        submittedPrices: submittedPricesMap,
                        draftPrices: draftPricesMap,
                    };
                }).sort((a, b) => a.commerceName.localeCompare(b.commerceName)); // Sort tasks alphabetically by commerce name

                return {
                    studentId: student.id,
                    studentName: student.name,
                    tasks
                };
            });

            return {
                periodId: period.id,
                periodName: period.name,
                status: period.status,
                // Filter out students who have no relevant tasks for this specific period
                students: studentProgress.filter(s => s.tasks.length > 0)
            };
        });

        return monitorDataByPeriod;
    }
};