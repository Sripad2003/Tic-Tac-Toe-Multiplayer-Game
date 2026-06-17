FROM nginx:alpine

WORKDIR /app

COPY . /usr/share/nginx/html

EXPOSE 9000

CMD ["nginx", "-g", "daemon off;"]
