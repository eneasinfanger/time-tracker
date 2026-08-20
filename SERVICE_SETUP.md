Here is a tailored `systemd` service file configured specifically for your **Time Tracker** backend using Gunicorn and reading from your `.env` file.

**Step 1: Create the Systemd Service File**

Open a new service file:

```bash
sudo nano /etc/systemd/system/timetracker.service

```

Paste the following configuration (replace `/path/to/backend` and `your_linux_user` with your actual directory and username):

```ini
[Unit]
Description=Time Tracker Application
After=network.target

[Service]
User=your_linux_user
WorkingDirectory=/path/to/backend
EnvironmentFile=/path/to/backend/.env

# Run Gunicorn using the virtual environment executable
ExecStart=/path/to/backend/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:3000 main:app

# Graceful Shutdown Configuration
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=15
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target

```

**Step 2: Load and Enable the Service**

Run these commands in your terminal:

```bash
# Reload systemd to recognize the new file
sudo systemctl daemon-reload

# Start the service right now
sudo systemctl start timetracker

# Enable the service to start automatically on system boot
sudo systemctl enable timetracker

```

**Key Tailored Adjustments**

* **Entrypoint (`main:app`)**: Pointed directly at your `main.py` entrypoint and the exposed WSGI `app` object.
* **Environment (`EnvironmentFile`)**: Automatically loads your `DATABASE_URL`, `SECRET_KEY`, and `JWT_SECRET_KEY` directly from your local `.env` file without exposing them inline.
* **Graceful Stopping (`KillSignal=SIGTERM` & `TimeoutStopSec=15`)**: Gives Gunicorn 15 seconds upon system shutdown to complete active HTTP requests and safely commit open database transactions to your SQLite file before stopping cleanly.
* **Binding**: Set to `--bind 127.0.0.1:5000` assuming local execution (or proxying via Nginx). If your frontend runs on a separate machine, change this to `--bind 0.0.0.0:5000`.

**Useful Operations**

* **Check Service Status**: `sudo systemctl status timetracker`
* **Stop Service Gracefully**: `sudo systemctl stop timetracker`
* **View Live App Logs**: `journalctl -u timetracker -f`
