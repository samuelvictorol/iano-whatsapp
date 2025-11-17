# ./frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copia todo o projeto (exceto o que estiver no .dockerignore)
COPY . .

# Agora sim instala tudo – o postinstall já enxerga o projeto Quasar
RUN npm install

EXPOSE 9000

# Quasar dev exposto pra fora do container
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "9000"]
