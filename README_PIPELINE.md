# 🚀 Hobbithole Release Pipeline

Deze map bevat de scripts voor het automatisch bouwen en publiceren van de Hobbithole Dashboard images naar Docker Hub.

## 📋 De Workflow

De pipeline bestaat uit twee stappen om veilig te kunnen ontwikkelen terwijl een release wordt voorbereid.

### Stap 1: Pre-Build (Staging)
Gebruik dit script om je huidige werk te 'bevriezen' voor een release.
```bash
./pre-build.sh
```
*   **Wat het doet:** 
    *   Leest de versie uit `index.html` (bijv. `1.8.6-dev`).
    *   Synchroniseert de nieuwste code naar `template_index.html`.
    *   Schoont de versienummers op (haalt `-dev` weg voor de release).
    *   Maakt een kopie van alle bestanden in `backups/v[versie]-pre-push/`.

### Stap 2: Push (Publishing)
Gebruik dit script om de klaargezette release te bouwen en te pushen.
```bash
./push.sh [versie]
```
*   **Wat het doet:**
    *   Gaat naar de juiste staging-map in `backups/`.
    *   Bouwt Multi-Arch images (**amd64** & **arm64**) via Docker Buildx.
    *   Pusht de images naar Docker Hub (`piggyoriginal/hobbithole-...`).
    *   Tags: `latest` en de specifieke versie (bijv. `1.8.6`).

---

## 🛠 Vereisten & Setup

1.  **Docker Login:** Zorg dat je bent ingelogd op Docker Hub:
    ```bash
    docker login
    ```
2.  **Multi-Arch (QEMU):** Als de build faalt op ARM64, draai dan dit op de **Proxmox host**:
    ```bash
    docker run --privileged --rm tonistiigi/binfmt --install all
    ```

## 📂 Belangrijke Bestanden
*   `index.html`: Je actieve development bestand (bevat jouw test-data).
*   `template_index.html`: De schone basis voor de Docker image (wordt automatisch bijgewerkt door `pre-build.sh`).
*   `CHANGELOG.md`: De bron voor de release notes in het dashboard en op Docker Hub.
*   `README.dockerhub.md`: De tekst die je kunt kopiëren naar de Docker Hub projectpagina.

---
*Gegenereerd door Gemini CLI voor LokaiOS*
