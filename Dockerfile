FROM nginx:alpine

# Kopieer de Nginx configuratie voor de proxy en IP-detectie
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Kopieer de schone template als de standaard index.html
COPY template_index.html /usr/share/nginx/html/index.html

# Kopieer de vertalingen
COPY i18n /usr/share/nginx/html/i18n

# Kopieer de changelog
COPY CHANGELOG.md /usr/share/nginx/html/CHANGELOG.md

# Maak de images directory aan (zodat gebruikers deze eventueel kunnen mounten)
RUN mkdir -p /usr/share/nginx/html/images

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]