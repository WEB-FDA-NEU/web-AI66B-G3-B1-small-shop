import select
import socket
import socketserver
import socks
import logging

MYSQL_TAILSCALE_IP = "100.115.168.64"
MYSQL_PORT = 3306

SOCKS_HOST = "127.0.0.1"
SOCKS_PORT = 1055

RELAY_HOST = "127.0.0.1"
RELAY_PORT = 13306

CONNECT_TIMEOUT = 15
BUFFER_SIZE = 65536

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)

logger = logging.getLogger("mysql-relay")


def handle_connection(client):
    remote = None

    try:
        remote = socks.socksocket()
        remote.set_proxy(
            socks.SOCKS5,
            SOCKS_HOST,
            SOCKS_PORT
        )
        remote.settimeout(CONNECT_TIMEOUT)

        logger.info(
            "Connecting to MySQL through Tailscale: %s:%s",
            MYSQL_TAILSCALE_IP,
            MYSQL_PORT
        )

        remote.connect((MYSQL_TAILSCALE_IP, MYSQL_PORT))
        remote.settimeout(None)

        logger.info("MySQL TCP connection established")

        sockets = [client, remote]

        while True:
            readable, _, exceptional = select.select(
                sockets, [], sockets
            )

            if exceptional:
                break

            for source in readable:
                data = source.recv(BUFFER_SIZE)

                if not data:
                    return

                destination = remote if source is client else client
                destination.sendall(data)

    except Exception:
        logger.exception("MySQL relay connection failed")

    finally:
        client.close()

        if remote is not None:
            remote.close()


class RelayServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


class RelayHandler(socketserver.BaseRequestHandler):
    def handle(self):
        handle_connection(self.request)


if __name__ == "__main__":
    logger.info(
        "MySQL TCP relay listening on %s:%s",
        RELAY_HOST,
        RELAY_PORT
    )

    with RelayServer(
        (RELAY_HOST, RELAY_PORT),
        RelayHandler
    ) as server:
        server.serve_forever()