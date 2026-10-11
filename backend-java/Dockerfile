FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY backend-java/pom.xml ./pom.xml
COPY backend-java/src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/target/circleup-connect-api-1.0.0.jar app.jar
ENV PORT=10000
EXPOSE 10000
ENTRYPOINT ["sh","-c","java -XX:MaxRAMPercentage=75 -Dserver.port=${PORT:-10000} -jar /app/app.jar"]