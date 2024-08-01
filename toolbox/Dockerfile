# Usa un'immagine base di Node.js per il build
FROM node:18 AS build

# Imposta la directory di lavoro
WORKDIR /app

# Copia il package.json e package-lock.json (o yarn.lock) nella directory di lavoro
COPY ext/package*.json ./

# Installa le dipendenze
RUN npm install

# Copia tutto il resto del codice sorgente nella directory di lavoro
COPY . .

# Costruisce l'applicazione frontend
RUN npm run build

# Usa NGINX come server web per servire i file statici
FROM nginx:alpine

# Copia i file di build generati nella directory di NGINX
COPY --from=build /app/build /usr/share/nginx/html

# Espone la porta 80
EXPOSE 80

# Comando per avviare NGINX
CMD ["nginx", "-g", "daemon off;"]
