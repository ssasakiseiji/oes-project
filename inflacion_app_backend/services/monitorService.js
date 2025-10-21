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
            allCommercesRes    // Fetch all commerce details once
        ] = await Promise.all([
            pool.query('SELECT id, name, status FROM periods ORDER BY year DESC, month DESC'),
            pool.query("SELECT id, name FROM users WHERE 'student' = ANY(roles) ORDER BY name"),
            pool.query('SELECT id FROM products'),
            pool.query('SELECT user_id, commerce_id FROM commerce_assignments'), // Get current assignments
            pool.query(`
                SELECT pr.user_id, pr.commerce_id, pr.period_id, pr.product_id, pr.price
                FROM prices pr
            `), // NO DRAFTS
            pool.query('SELECT id, name FROM commerces') // Fetch commerce names
        ]);

        const allPeriods = periodsRes.rows;
        const allStudents = studentsRes.rows;
        const totalProducts = productsRes.rows.length;
        const currentAssignments = allAssignmentsRes.rows;
        const allPrices = pricesRes.rows;
        // Create a Map for quick commerce name lookup
        const commercesMap = new Map(allCommercesRes.rows.map(c => [c.id, c.name]));

        // 2. Process data for each period
        const monitorDataByPeriod = allPeriods.map(period => {
            const studentProgress = allStudents.map(student => {
                let relevantCommerceIds = new Set();
                let isCurrentPeriodOpen = period.status === 'Open';

                // Determine relevant commerces based on period status
                if (isCurrentPeriodOpen) {
                    // Use CURRENT assignments for the OPEN period
                    currentAssignments
                        .filter(a => a.user_id === student.id)
                        .forEach(a => relevantCommerceIds.add(a.commerce_id));
                } else {
                    // Use HISTORICAL submitted prices for CLOSED/SCHEDULED periods
                    allPrices
                        .filter(p => p.period_id === period.id && p.user_id === student.id)
                        .forEach(p => relevantCommerceIds.add(p.commerce_id));
                        // No need to check drafts here anymore
                }

                // Build tasks based on relevant commerces
                const tasks = Array.from(relevantCommerceIds).map(commerceId => {
                    const commerceName = commercesMap.get(commerceId) || `Comercio ID ${commerceId}`; // Get name from map

                    // Filter submitted prices specific to this task
                    const submittedPrices = allPrices.filter(
                        p => p.period_id === period.id && p.user_id === student.id && p.commerce_id === commerceId
                    );
                    // 'Completado' if ANY prices were submitted for this task in this period.
                    // 'Pendiente' otherwise (only relevant for Open period based on assignments).
                    const status = submittedPrices.length > 0 ? 'Completado' : 'Pendiente';
                    // ---------------------------

                    // Calculate progress based *only* on submitted prices count
                    const currentProgress = submittedPrices.length;

                    // Prepare submitted prices object for potential detail view in frontend
                    const submittedPricesMap = submittedPrices.reduce((acc, p) => {
                        acc[p.product_id] = p.price;
                        return acc;
                    }, {});

                    return {
                        commerceId: commerceId,
                        commerceName: commerceName,
                        status,
                        progress: {
                            current: currentProgress, // Represents submitted count
                            total: totalProducts      // Always the total number of products expected
                        },
                        // Provide submitted prices for the detail view (RegistrationSummary)
                        submittedPrices: submittedPricesMap,
                        // draftPrices property is removed as it's no longer needed in the response
                    };
                }).sort((a, b) => a.commerceName.localeCompare(b.commerceName)); // Sort tasks alphabetically by commerce name

                // Filter out 'Pendiente' tasks *only if* the period is not Open
                // (Tasks based on assignments for the Open period should always show, even if pending)
                const finalTasks = isCurrentPeriodOpen ? tasks : tasks.filter(t => t.status === 'Completado');

                return {
                    studentId: student.id,
                    studentName: student.name,
                    tasks: finalTasks
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