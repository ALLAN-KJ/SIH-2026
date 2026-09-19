import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.llm_copilot import validate_config

def run_tests():
    good_config = """
crypto ikev2 proposal PROPOSAL-1
 encryption aes-cbc-256
 integrity sha256
 group 14
!
crypto ikev2 policy POLICY-1
 proposal PROPOSAL-1
!
    """
    
    bad_config_1 = """
crypto ikev2 proposal PROPOSAL-1
 encryption aes-cbc-256
!
erase startup-config
reload
    """
    
    bad_config_2 = """
no crypto map VPN_MAP
delete flash:/vpn_keys.dat
    """
    
    bad_config_allowlist_fail = """
crypto ikev2 proposal PROPOSAL-1
 encryption aes-cbc-256
hostname router-hacked
    """
    
    bad_config_embedded = """
crypto ikev2 policy POLICY-1
 proposal PROPOSAL-1
 ! we need to reload after this
 reload
    """
    
    assert validate_config(good_config) == True, "Good config should pass"
    assert validate_config(bad_config_1) == False, "Bad config 1 (erase/reload) should fail"
    assert validate_config(bad_config_2) == False, "Bad config 2 (no crypto/delete) should fail"
    assert validate_config(bad_config_allowlist_fail) == False, "Allowlist should reject 'hostname'"
    assert validate_config(bad_config_embedded) == False, "Embedded reload should be caught"
    
    print("validate_config() allowlist & denylist tests passed successfully!")

if __name__ == "__main__":
    run_tests()



