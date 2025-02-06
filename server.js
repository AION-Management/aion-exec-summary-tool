const axios = require('axios');
const sql = require('mssql');
const nodemailer = require('nodemailer');
const cliProgress = require('cli-progress');

// Configuration
const SQL_IP = 'sql.aionmgmt.com';
const DATABASE = 'reports';
const DBUSER = 'mwilke';
const DBPASS = "Jac77415!";

// Set your date range here
const START_DATE = '2025-01-01';
const END_DATE = '2025-01-31';

const emailConfig = {
    user: 'aionSQLReport@gmail.com',
    pass: 'siwzbqqipqeoghyn',
    to: ['s.dragone@aionmanagement.com', 'm.wilke@aionmanagement.com']
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
    }
});

const dbConfig = {
    user: DBUSER,
    password: DBPASS,
    server: SQL_IP,
    database: DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function sendEmail(subject, body) {
    try {
        await transporter.sendMail({
            from: emailConfig.user,
            to: emailConfig.to.join(', '),
            subject: subject,
            text: body
        });
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

async function ensureTable(pool) {
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'execSummaryTool')
            BEGIN
                CREATE TABLE execSummaryTool (
                    event_id VARCHAR(100),
                    conversation_id VARCHAR(100),
                    building_name VARCHAR(200),
                    guest_card_id VARCHAR(100),
                    global_session_id VARCHAR(100),
                    global_session_id_building VARCHAR(100),
                    lead_first_name VARCHAR(100),
                    lead_last_name VARCHAR(100),
                    lead_email VARCHAR(200),
                    lead_phone_number VARCHAR(100),
                    channel VARCHAR(50),
                    marketing_source VARCHAR(100),
                    event_type VARCHAR(50),
                    event_datetime DATETIME,
                    created_date DATETIME
                )
            END`);
        console.log('Table verified/created successfully');
    } catch (err) {
        console.error('Error creating table:', err);
        throw err;
    }
}

function truncateString(str, limit) {
    if (!str) return str;
    return str.length > limit ? str.substring(0, limit) : str;
}

async function insertEventData(pool, event) {
    const sanitizedEvent = {
        event_id: truncateString(event.event_id, 100),
        conversation_id: truncateString(event.conversation_id, 100),
        building_name: truncateString(event.building_name, 200),
        guest_card_id: truncateString(event.guest_card_id, 100),
        global_session_id: truncateString(event.global_session_id, 100),
        global_session_id_building: truncateString(event.global_session_id_building, 100),
        lead_first_name: truncateString(event.lead_first_name, 100),
        lead_last_name: truncateString(event.lead_last_name, 100),
        lead_email: truncateString(event.lead_email, 200),
        lead_phone_number: truncateString(event.lead_phone_number, 100),
        channel: truncateString(event.channel, 50),
        marketing_source: truncateString(event.marketing_source, 100),
        event_type: truncateString(event.event_type, 50),
        event_datetime: event.event_datetime
    };

    try {
        await pool.request()
            .input('event_id', sql.VarChar(100), sanitizedEvent.event_id)
            .input('conversation_id', sql.VarChar(100), sanitizedEvent.conversation_id)
            .input('building_name', sql.VarChar(200), sanitizedEvent.building_name)
            .input('guest_card_id', sql.VarChar(100), sanitizedEvent.guest_card_id)
            .input('global_session_id', sql.VarChar(100), sanitizedEvent.global_session_id)
            .input('global_session_id_building', sql.VarChar(100), sanitizedEvent.global_session_id_building)
            .input('lead_first_name', sql.VarChar(100), sanitizedEvent.lead_first_name)
            .input('lead_last_name', sql.VarChar(100), sanitizedEvent.lead_last_name)
            .input('lead_email', sql.VarChar(200), sanitizedEvent.lead_email)
            .input('lead_phone_number', sql.VarChar(100), sanitizedEvent.lead_phone_number)
            .input('channel', sql.VarChar(50), sanitizedEvent.channel)
            .input('marketing_source', sql.VarChar(100), sanitizedEvent.marketing_source)
            .input('event_type', sql.VarChar(50), sanitizedEvent.event_type)
            .input('event_datetime', sql.DateTime, new Date(sanitizedEvent.event_datetime))
            .query(`
                INSERT INTO execSummaryTool (
                    event_id, conversation_id, building_name, guest_card_id,
                    global_session_id, global_session_id_building,
                    lead_first_name, lead_last_name, lead_email, lead_phone_number,
                    channel, marketing_source, event_type, event_datetime, created_date
                )
                VALUES (
                    @event_id, @conversation_id, @building_name, @guest_card_id,
                    @global_session_id, @global_session_id_building,
                    @lead_first_name, @lead_last_name, @lead_email, @lead_phone_number,
                    @channel, @marketing_source, @event_type, @event_datetime, GETDATE()
                )
            `);
    } catch (err) {
        console.error(`Error inserting event ${event.event_id}:`, err);
        throw err;
    }
}

async function processAndSaveReport() {
    let pool;
    let processedEvents = 0;
    let errorEvents = 0;
    const startTime = new Date();
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    try {
        pool = await sql.connect(dbConfig);
        await ensureTable(pool);
        
        const url = `https://app.meetelise.com/reportingApi/leasing/generateReport/events?start_date=${START_DATE}&end_date=${END_DATE}`;
        console.log('Fetching data...');
        
        const headers = {
            'X-SecurityKey': "ef9329a061f9c69e31455d12a31e0e3c"
        };
        
        const response = await axios.get(url, { headers });
        const events = response.data
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));

        console.log(`Found ${events.length} events to process`);
        progressBar.start(events.length, 0);
        
        for (const event of events) {
            try {
                await insertEventData(pool, event);
                processedEvents++;
                progressBar.update(processedEvents);
            } catch (error) {
                errorEvents++;
                console.error(`\nFailed to process event ${event.event_id}:`, error);
            }
        }

        progressBar.stop();

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        const emailBody = `
            Data Processing Report
            ---------------------
            Date Range: ${START_DATE} to ${END_DATE}
            Total Events: ${events.length}
            Events Processed: ${processedEvents}
            Errors: ${errorEvents}
            Duration: ${duration} seconds

            Job completed at: ${endTime.toLocaleString()}
        `;

        await sendEmail('Elise AI Events Processing Report', emailBody);

    } catch (error) {
        console.error('Process error:', error);
        await sendEmail('Elise AI Events Processing ERROR', `Error processing events: ${error.message}`);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

processAndSaveReport()
    .then(() => {
        console.log('Process completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });