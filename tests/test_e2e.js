const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:8000';

async function test_pipeline(filepath) {
    console.log(`\n--- Testing ${filepath} ---`);
    if (!fs.existsSync(filepath)) {
        console.log(`File not found: ${filepath}`);
        return;
    }
    
    try {
        const fileData = fs.readFileSync(filepath);
        const formData = new FormData();
        const blob = new Blob([fileData], { type: 'application/vnd.tcpdump.pcap' });
        formData.append('file', blob, path.basename(filepath));

        // 1. Upload
        const uploadRes = await fetch(`${API_URL}/upload_pcap`, { method: 'POST', body: formData });
        if (!uploadRes.ok) {
            console.log(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
            return;
        }
        const ipsecReq = await uploadRes.json();

        // 2. Assess
        const assessRes = await fetch(`${API_URL}/assess`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ipsecReq)
        });
        const risk = await assessRes.json();

        // 3. Remediate
        const remediateRes = await fetch(`${API_URL}/remediate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                risk_label: risk.risk_label,
                flagged_issues: risk.flagged_issues,
                top_contributing_factors: risk.top_contributing_factors
            })
        });
        const remediation = await remediateRes.json();

        // 4. PQC
        const pqcRes = await fetch(`${API_URL}/pqc_score`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                encryption_algorithm: ipsecReq.encryption_algorithm,
                key_length_bits: ipsecReq.key_length_bits,
                hash_algorithm: ipsecReq.hash_algorithm,
                dh_group: ipsecReq.dh_group
            })
        });
        const pqc = await pqcRes.json();

        // 5. Log
        const logRes = await fetch(`${API_URL}/log`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                report_data: { ipsec_request: ipsecReq, risk_assessment: risk, pqc_score: pqc.pqc_score }
            })
        });
        const audit = await logRes.json();

        console.log("Success!");
        console.log("Risk Score:", risk.risk_score, risk.risk_label);
        console.log("PQC Safe:", pqc.is_quantum_safe);
        console.log("Remediation length:", remediation.config_diff?.length);
        console.log("Audit Hash:", audit.report_hash);
    } catch (e) {
        console.log(`Exception: ${e}`);
    }
}

async function runTests() {
    await test_pipeline("scenario_critical_legacy.pcap");
    await test_pipeline("scenario_moderate_transition.pcap");
    await test_pipeline("scenario_strong_modern.pcap");

    fs.writeFileSync("dummy.pcap", "NOT A REAL PCAP DATA".repeat(10));
    await test_pipeline("dummy.pcap");

    console.log("\n--- Testing Audit Verification ---");
    try {
        const verify_resp = await fetch(`${API_URL}/verify`);
        console.log(`Verification Status: ${verify_resp.status}`);
        console.log(await verify_resp.json());
    } catch (e) {
        console.log(`Exception: ${e}`);
    }
}

runTests();
