# EVE FLEET MANAGER

This is an online tool to manage your fleets.
### prerequisites

create the sqlite3 db file
```lang=shell
touch ./data/fleets.db
```

create the `.env` file and update the properties
```lang=shell
cp .env.local .env
```

NOTE: the callback URL is at `/api/auth/callback/eveonline`

create the `config.yaml` file and update the properties
```lang=shell
cp config.example.yaml config.yaml
```

### Run fleet manager

```lang=shell
docker compose -f docker-compose.yml up --build -d
```

### Screenshots

<img width="824" height="576" alt="screenshotfleetmanager" src="https://github.com/user-attachments/assets/8282791b-ea6c-4332-80ee-c8cef46f371a" />

<img width="774" height="651" alt="Screenshot 2026-06-07 at 14 02 40" src="https://github.com/user-attachments/assets/e831f686-3676-4945-a4ef-2b20ce3568ad" />

<img width="655" height="809" alt="Screenshot 2026-06-07 at 14 02 33" src="https://github.com/user-attachments/assets/aae7c0aa-39a1-492d-9840-67abe8c1eb42" />
