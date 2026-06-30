# USB Eject Host Configuration Guide

This guide describes how to configure host-side watchers to handle external storage ejection in **SIGNAL** mode.

SIGNAL mode is the recommended and safest method for ejecting USB drives or external SSDs from the dashboard. Instead of running the container with root permissions and privileged mode (`privileged: true`), the dashboard writes a signal file to a shared directory. A lightweight watcher running natively on the host machine detects this signal, safely unmounts the disk, shuts down power to the USB port (to prevent data corruption), and reports back success to the dashboard.

---

## Architecture Overview

1. **Dashboard UI**: The user clicks the "Eject" button.
2. **Dashboard Backend**: Writes an empty directory or file at `/usb/.eject_signals/<device_id>` inside the container.
3. **Volume Mount**: The container's `/usb` directory is bind-mounted to a host path (e.g., `/mnt/usb-auto` or `/volume1/usb-share`).
4. **Host Watcher**: A native service on the host detects the change in the `.eject_signals` folder.
5. **Safe Ejection**: The host flushes the write caches (`sync`), unmounts the partition, powers off the disk (using `udisksctl` or Synology tooling), cleans up the mount folders, and creates a success flag at `/usb/.ejected_<device_id>`.
6. **Dashboard Feedback**: The backend detects the success flag, notifies the UI, and clears the flag.

---

## 1. Proxmox, Debian, and Ubuntu Setup (Systemd)

On systemd-based Linux systems, you can use a combination of a systemd path unit (which monitors filesystem changes with `inotify`) and a systemd oneshot service.

### Step 1.1: Create the Handler Script
Create the handler script at `/usr/local/bin/usb-eject-handler.sh` on the host:

```bash
#!/bin/bash
BASE_PATH="/mnt/usb-auto"
SIGNAL_PATH="$BASE_PATH/.eject_signals"

# Process all signal directories
for signal in $SIGNAL_PATH/*; do
    [ -e "$signal" ] || continue
    PART_NAME=$(basename "$signal")
    MOUNT_DIR="$BASE_PATH/$PART_NAME"
    
    echo "[USB-EJECT] Eject signal detected for $PART_NAME"
    
    # Flush write caches to prevent data corruption
    sync
    
    # Perform lazy unmount
    umount -l "$MOUNT_DIR" 2>/dev/null
    
    # Find the parent device name (e.g. sdb for partition sdb1)
    DEV_PATH=$(lsblk -no PKNAME /dev/$PART_NAME 2>/dev/null)
    if [ ! -z "$DEV_PATH" ]; then
        # Power off the disk safely
        udisksctl power-off -b "/dev/$DEV_PATH" 2>/dev/null
    fi
    
    # Clean up signal directory and mount path
    rm -rf "$signal"
    rmdir "$MOUNT_DIR" 2>/dev/null
    
    # Notify dashboard of success
    touch "$BASE_PATH/.ejected_$PART_NAME"
done
```

Make the script executable:
```bash
sudo chmod +x /usr/local/bin/usb-eject-handler.sh
```

### Step 1.2: Create the Systemd Path Unit
Create `/etc/systemd/system/usb-eject-watcher.path` to monitor the signal path:

```ini
[Unit]
Description=Monitor /mnt/usb-auto/.eject_signals

[Path]
PathChanged=/mnt/usb-auto/.eject_signals
Unit=usb-eject-watcher.service

[Install]
WantedBy=multi-user.target
```

### Step 1.3: Create the Systemd Service Unit
Create `/etc/systemd/system/usb-eject-watcher.service`:

```ini
[Unit]
Description=USB Eject Handler Service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/usb-eject-handler.sh
```

### Step 1.4: Enable and Start the Watcher
Reload systemd configurations, enable and start the path watcher:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now usb-eject-watcher.path
```

---

## 2. Synology DSM Setup (Task Scheduler / Cron)

Synology DSM does not support standard user-facing systemd path watchers. Instead, the most reliable approach is to run a lightweight daemon loop that starts on boot using DSM's **Task Scheduler**.

### Step 2.1: Create the DSM Handler Script
Save this script on your volume (e.g., `/volume1/docker/dashboard/usb-eject-daemon.sh`):

```bash
#!/bin/bash
BASE_PATH="/volume1/usb-auto"
SIGNAL_PATH="$BASE_PATH/.eject_signals"

echo "Starting USB Eject Daemon..."

while true; do
    if [ -d "$SIGNAL_PATH" ] && [ "$(ls -A "$SIGNAL_PATH" 2>/dev/null)" ]; then
        for signal in $SIGNAL_PATH/*; do
            [ -e "$signal" ] || continue
            PART_NAME=$(basename "$signal")
            MOUNT_DIR="$BASE_PATH/$PART_NAME"
            
            echo "[USB-EJECT] Ejecting $PART_NAME..."
            
            # Flush write cache
            sync
            
            # Unmount the partition
            umount -l "$MOUNT_DIR" 2>/dev/null
            
            # Synology-specific disk safe-removal
            # Find the USB share assignment and use Synology CLI helper if available
            SYNO_DEV=$(basename "$(readlink -f /sys/class/block/$PART_NAME/.. 2>/dev/null)" 2>/dev/null)
            if [ ! -z "$SYNO_DEV" ]; then
                /usr/syno/bin/synousbdisk --eject "$SYNO_DEV" 2>/dev/null
            fi
            
            # Clean up
            rm -rf "$signal"
            rmdir "$MOUNT_DIR" 2>/dev/null
            
            # Success flag for dashboard
            touch "$BASE_PATH/.ejected_$PART_NAME"
        done
    fi
    # Sleep for 2 seconds to keep response time fast while maintaining low CPU usage
    sleep 2
done
```

Make the script executable:
```bash
chmod +x /volume1/docker/dashboard/usb-eject-daemon.sh
```

### Step 2.2: Register the Script in Task Scheduler
1. Open the DSM **Control Panel** and navigate to **Task Scheduler**.
2. Click **Create** -> **Triggered Task** -> **User-defined script**.
3. Set the Task Name to `USB Eject Daemon`.
4. Set the User to `root`.
5. Set the Event to **Boot-up**.
6. Under **Task Settings**, enter the following command:
   ```bash
   /volume1/docker/dashboard/usb-eject-daemon.sh &
   ```
7. Click **OK** to save the task.
8. Right-click the newly created task and select **Run** to start it immediately without restarting DSM.

---

## 3. Docker Compose Mapping

Ensure that the volume mounts are aligned between the host and your container. For example, if you mapped your USB mount point to `/mnt/usb-auto` on the host:

```yaml
services:
  config-api:
    image: piggyoriginal/hobbithole-config-api:latest
    container_name: hobbithole-config-api
    restart: unless-stopped
    environment:
      - USB_EJECT_METHOD=signal # Default, but explicitly set
      - USB_PATH=/usb
    volumes:
      - ./data:/app/data
      - /mnt/usb-auto:/usb # Shared USB path with the host
```
