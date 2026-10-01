# Atlas CMMS API

This is the REST backend (Java 17-Spring Boot) of the web
application.
We would be very happy to have new contributors join us.
**And please star the repo**.

## How to run locally ?

Install JDK 17 and make a PostgreSQL database available as `atlas` on `localhost:5432`.
The `dev` profile uses the local defaults `rootUser` / `mypassword`; override them with
`DB_URL`, `DB_USER` and `DB_PWD` if your local database uses different connection settings.
Set `JWT_SECRET_KEY` when using a shared development environment. The fallback key is for
local development only. Other service URLs and credentials can be supplied through the
environment variables documented [here](../README.MD#set-environment-variables).

```shell
mvn spring-boot:run
```
