FROM nginx:alpine

# Kopieer de Nginx configuratie voor de proxy en IP-detectie
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Release UI: stripped template (no LAB_ONLY). Lab dogfood serves public/index.html via compose map-mount.
COPY template_index.html /usr/share/nginx/html/index.html

# Statische assets uit public/ (lab + staging layout). Nooit public/index.html — die heeft lab-only code.
# public/images (o.a. de showcase-GIF) hoort op GitHub/README, niet in dit image.
COPY public/i18n /usr/share/nginx/html/i18n
COPY public/CHANGELOG.md /usr/share/nginx/html/CHANGELOG.md
COPY public/CHANGELOG.en.md /usr/share/nginx/html/CHANGELOG.en.md

# Maak de images directory aan (zodat gebruikers deze eventueel kunnen mounten)
RUN mkdir -p /usr/share/nginx/html/images

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
