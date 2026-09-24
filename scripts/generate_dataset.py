import pandas as pd
import numpy as np
import uuid
import random

def generate_synthetic_dataset(num_rows=5000):
    np.random.seed(42)
    random.seed(42)

    ike_versions = ["IKEv1", "IKEv2"]
    ike_modes = ["Main", "Aggressive", "Quick"]
    enc_algs = ["DES", "3DES", "AES-128-CBC", "AES-256-CBC", "AES-256-GCM", "ChaCha20-Poly1305"]
    hash_algs = ["MD5", "SHA1", "SHA256", "SHA384", "SHA512"]
    dh_groups = [1, 2, 5, 14, 19, 20, 21, 31]
    auth_methods = ["PSK", "RSA-Sig", "ECDSA-Sig"]
    op_modes = ["Tunnel", "Transport"]
    pfs_options = [True, False]
    sa_lifetimes = [3600, 28800, 86400]

    data = []
    
    for _ in range(num_rows):
        ike_v = np.random.choice(ike_versions, p=[0.3, 0.7])
        ike_m = np.random.choice(ike_modes) if ike_v == "IKEv1" else "Main"
        enc = np.random.choice(enc_algs)
        
        # Determine key length based on enc
        if enc == "DES": kl = 56
        elif enc == "3DES": kl = 112
        elif "128" in enc: kl = 128
        else: kl = 256
            
        hash_alg = np.random.choice(hash_algs)
        dh = np.random.choice(dh_groups)
        auth = np.random.choice(auth_methods)
        op_m = np.random.choice(op_modes)
        pfs = np.random.choice(pfs_options)
        sa = np.random.choice(sa_lifetimes)

        # Risk scoring logic (0 to 100, lower is better... wait, typically Risk Score: higher = worse)
        # Let's say higher score = higher risk.
        score = 0
        issues = []
        
        if ike_v == "IKEv1":
            score += 20
            issues.append("Legacy IKEv1 used")
            if ike_m == "Aggressive":
                score += 30
                issues.append("IKEv1 Aggressive mode vulnerable to offline dictionary attacks")
                
        if enc in ["DES", "3DES"]:
            score += 40
            issues.append(f"Weak encryption {enc}")
            
        if hash_alg in ["MD5", "SHA1"]:
            score += 30
            issues.append(f"Weak hash {hash_alg}")
            
        if dh in [1, 2, 5]:
            score += 30
            issues.append(f"Weak DH group {dh}")
            
        if auth == "PSK" and ike_m == "Aggressive":
            score += 20
            issues.append("PSK with Aggressive Mode is highly risky")
            
        if not pfs:
            score += 20
            issues.append("Perfect Forward Secrecy (PFS) is disabled")
            
        # Add some noise to score
        score += random.randint(-5, 5)
        score = max(0, min(100, score)) # bound between 0 and 100
        
        if score >= 80:
            label = "Critical"
        elif score >= 60:
            label = "Weak"
        elif score >= 40:
            label = "Moderate"
        elif score >= 20:
            label = "Strong"
        else:
            label = "Low"
            
        # Empty issues if none
        flagged = "; ".join(issues) if issues else "None"
        
        data.append({
            "session_id": str(uuid.uuid4()),
            "ike_version": ike_v,
            "ike_mode": ike_m,
            "encryption_algorithm": enc,
            "key_length_bits": kl,
            "hash_algorithm": hash_alg,
            "dh_group": dh,
            "auth_method": auth,
            "operation_mode": op_m,
            "pfs_enabled": pfs,
            "sa_lifetime_seconds": sa,
            "risk_score": score,
            "risk_label": label,
            "flagged_issues": flagged
        })

    df = pd.DataFrame(data)
    df.to_csv("backend/data/ipsec_synthetic_dataset.csv", index=False)
    print(f"Generated {num_rows} rows in backend/data/ipsec_synthetic_dataset.csv")

if __name__ == "__main__":
    generate_synthetic_dataset()

