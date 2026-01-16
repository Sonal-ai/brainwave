const FormData = require('form-data');
const fs = require('fs');

// Using the key provided by the user in chat
const API_KEY = 'ms7e1bDLNbYYhZXPKXTdEXDT6r8Ys9bf';

async function test() {
    const { default: fetch } = await import('node-fetch');

    // Create a dummy file
    fs.writeFileSync('test_upload.txt', 'Hello OnDemand World');

    const buffer = fs.readFileSync('test_upload.txt');
    const form = new FormData();
    form.append('file', buffer, { filename: 'test_upload.txt', contentType: 'text/plain' });

    console.log('--- DIAGNOSTIC START ---');
    console.log('Target: https://api.on-demand.io/media/v1/public/file');
    console.log('API Key:', API_KEY.substring(0, 5) + '...');

    try {
        const res = await fetch('https://api.on-demand.io/media/v1/public/file', {
            method: 'POST',
            headers: {
                'apikey': API_KEY,
                ...form.getHeaders()
            },
            body: form
        });

        console.log('HTTP Status:', res.status);
        console.log('Status Text:', res.statusText);

        const text = await res.text();
        console.log('Response Body:', text);

        if (res.ok) {
            console.log('✅ SUCCESS: Upload worked from Node scripts.');
        } else {
            console.log('❌ FAILURE: API rejected request.');
        }

    } catch (e) {
        console.error('EXCEPTION:', e);
    } finally {
        if (fs.existsSync('test_upload.txt')) fs.unlinkSync('test_upload.txt');
        console.log('--- DIAGNOSTIC END ---');
    }
}

test();
