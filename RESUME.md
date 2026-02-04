# EllyMUD Oracle Cloud Deployment - Resume Point

**Created**: 2026-02-04
**Purpose**: Context for resuming Oracle Cloud deployment after session compaction

## Current State

### Oracle Cloud Infrastructure - CREATED
- **Tenancy**: ellyseum (ocid1.tenancy.oc1..aaaaaaaaifejdsjmzdguxj7ajk3x5hyrhx67hdcld5ctpb2bsvnhmpvr2msq)
- **Region**: us-ashburn-1

### Networking - CREATED
- **VCN**: ellymud-vcn (ocid1.vcn.oc1.iad.amaaaaaa5vtn4eyargmyzy3qh6nq27ygscuflg3cahgdv4anfii6654ardsa)
- **Subnet**: ellymud-subnet (ocid1.subnet.oc1.iad.aaaaaaaaic2b67uioetmeu6gwjxuvit67nm6wq5jnka5mhsawxfmcpgnluoa)
- **Internet Gateway**: ellymud-igw (ocid1.internetgateway.oc1.iad.aaaaaaaaygfvzhqapyhkpta7mutgjmayzk3udl2n2m52tw5nkydqaagu53rq)
- **Security List**: Ports open: 22, 23, 80, 443, 8023, 8080, 3100

### Compute Instance - RUNNING
- **Name**: ellymud-server
- **Instance ID**: ocid1.instance.oc1.iad.anuwcljr5vtn4eycdezuh2ysqnnb6yfalrw266b75vrpwxqtbcatrmvvsmoq
- **Shape**: VM.Standard.E2.1 (1 OCPU, 8GB RAM, 2 vCPUs)
- **OS**: Oracle Linux 9.6
- **Public IP**: 150.136.45.123
- **SSH User**: opc
- **SSH Key**: `~/.ssh/oracle_ellymud` (no passphrase)
- **SSH Command**: `ssh -i ~/.ssh/oracle_ellymud opc@150.136.45.123`

## Files Created This Session

### Production Docker Setup
- `docker-compose.prod.yml` - Full stack: nginx + app + redis + postgres
- `nginx/nginx.conf` - Main config with TCP stream for telnet (port 23→8023)
- `nginx/conf.d/default.conf` - HTTP/HTTPS proxy (80→8080, 443→8080)
- `scripts/deploy-prod.sh` - Automated deployment with Let's Encrypt SSL
- `scripts/bootstrap-oracle.sh` - Oracle VM bootstrap script

### Port Mapping (Production)
| External | Internal | Service |
|----------|----------|---------|
| 23 | 8023 | Telnet (TCP stream via nginx) |
| 80 | - | HTTP → HTTPS redirect |
| 443 | 8080 | HTTPS WebSocket/Web |
| 443/api/* | 3100 | MCP API |

## Pending Tasks

1. **Update Oracle instance with new SSH key**
   ```bash
   # Get new public key
   cat ~/.ssh/oracle_ellymud.pub

   # Update instance metadata (or use console)
   oci compute instance update --instance-id ocid1.instance.oc1.iad.anuwcljr5vtn4eycb7crcbunsmyagtglpprgwybgvegtepcjbh6hxryeke3a \
     --metadata '{"ssh_authorized_keys":"<new-public-key>"}'
   ```

2. **SSH into server and set up Docker**
   ```bash
   ssh -i ~/.ssh/oracle_ellymud opc@150.136.219.215
   ```

3. **Run bootstrap on server**
   - Install Docker
   - Clone repo
   - Configure firewall
   - Set up SSL certs
   - Start services

4. **Domain**: User needs to specify domain for SSL cert (ellymud.com? play.ellyseum.dev?)

## OCI CLI Config
- Config file: `~/.oci/config`
- API Key: `~/.oci/oci_api_key.pem`
- Fingerprint: 97:df:ef:f8:68:cd:66:0d:dd:8d:d1:bc:a7:27:35:dc

## Commands Reference

```bash
# SSH to server (after key update)
ssh -i ~/.ssh/oracle_ellymud opc@150.136.219.215

# OCI CLI (suppress warnings)
SUPPRESS_LABEL_WARNING=True oci <command>

# List instances
oci compute instance list -c "ocid1.tenancy.oc1..aaaaaaaaifejdsjmzdguxj7ajk3x5hyrhx67hdcld5ctpb2bsvnhmpvr2msq"

# Get instance public IP
oci compute instance list-vnics --instance-id "ocid1.instance.oc1.iad.anuwcljr5vtn4eycb7crcbunsmyagtglpprgwybgvegtepcjbh6hxryeke3a" | jq -r '.data[0]["public-ip"]'
```

## Earlier Session Work (Committed)

Test mode isolation system was implemented and pushed:
- `--testMode` flag for isolated test data directories
- MCP command blocking outside test mode
- E2E tester agent documentation updated

Commits pushed:
- feat(test): add test mode isolation system
- feat(command): add map and walk commands with pathfinding
- chore(test): set NODE_ENV=test in npm test scripts
- feat(admin): add cross-area exit creation in WorldBuilder
- test(config): fix cliConfig test for test mode isolation
- chore(scripts): exclude test runtime dirs from doc checker
