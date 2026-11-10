
#!/bin/sh
set -eu

: "${TS_AUTHKEY:?Missing TS_AUTHKEY environment variable}"

TAILSCALE_SOCKET="/var/run/tailscale/tailscaled.sock"
TAILSCALE_STATE="/var/lib/tailscale/tailscaled.state"

mkdir -p /var/lib/tailscale /var/run/tailscale

echo "===== START TAILSCALE DAEMON ====="

tailscaled \
    --state="$TAILSCALE_STATE" \
    --socket="$TAILSCALE_SOCKET" \
    --tun=userspace-networking \
    --socks5-server=127.0.0.1:1055 &

TAILSCALE_PID=$!

READY=0

for i in $(seq 1 30); do
    if [ -S "$TAILSCALE_SOCKET" ]; then
        READY=1
        break
    fi

    if ! kill -0 "$TAILSCALE_PID" 2>/dev/null; then
        echo "ERROR: tailscaled process exited"
        exit 1
    fi

    sleep 1
done

if [ "$READY" -ne 1 ]; then
    echo "ERROR: Tailscale socket was not created"
    exit 1
fi

echo "===== CONNECT TO TAILSCALE ====="

tailscale \
    --socket="$TAILSCALE_SOCKET" \
    up \
    --authkey="$TS_AUTHKEY" \
    --hostname=render-yums-test \
    --accept-dns=false

echo "===== TAILSCALE STATUS ====="

tailscale --socket="$TAILSCALE_SOCKET" status

echo "===== TEST WINDOWS DEVICE ====="

tailscale \
    --socket="$TAILSCALE_SOCKET" \
    ping \
    --timeout=10s \
    100.115.168.64 || echo "WARNING: Windows ping test failed"

echo "===== START MYSQL TCP RELAY ====="

python -u /app/backend/mysql_tcp_relay.py &
RELAY_PID=$!

sleep 2

if ! kill -0 "$RELAY_PID" 2>/dev/null; then
    echo "ERROR: MySQL TCP relay process exited"
    exit 1
fi

echo "===== MYSQL RELAY PROCESS RUNNING ====="

echo "===== START FASTAPI ====="

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-10000}"