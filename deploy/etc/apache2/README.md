# Apache configuration

Reference copies of the server's Apache config. **Nothing here is deployed
automatically** — the server is not a git checkout.

| File | Server path |
|---|---|
| `sites-available/pistaflights.conf` | `/etc/apache2/sites-available/` — port 80, redirects to HTTPS |
| `sites-available/pistaflights-le-ssl.conf` | `/etc/apache2/sites-available/` — port 443, certbot-managed |
| `conf-available/pista-hardening.conf` | `/etc/apache2/conf-available/` |

To restore on a rebuilt instance:

```bash
sudo cp sites-available/*.conf /etc/apache2/sites-available/
sudo cp conf-available/pista-hardening.conf /etc/apache2/conf-available/
sudo a2ensite pistaflights pistaflights-le-ssl
sudo a2enconf pista-hardening
sudo a2enmod proxy proxy_http rewrite ssl
sudo apache2ctl configtest && sudo systemctl reload apache2
sudo certbot renew --dry-run
```

The `-le-ssl.conf` references certificate paths that will not exist until
certbot has run on the new instance. Either run `certbot --apache` first and
let it regenerate the vhost, or install the certificates before enabling
the site — otherwise Apache will fail to start.
