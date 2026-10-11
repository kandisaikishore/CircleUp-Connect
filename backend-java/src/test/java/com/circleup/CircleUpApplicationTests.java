package com.circleup;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
  "spring.datasource.url=jdbc:h2:mem:circleup-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
  "JWT_SECRET=ci-test-secret-with-enough-entropy"
})
class CircleUpApplicationTests {
  @LocalServerPort int port;
  @Autowired TestRestTemplate http;

  @Test void healthEndpointReportsService() {
    var response=http.getForEntity("http://localhost:"+port+"/api/health",Map.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).containsEntry("service","circleup-connect-api-java");
  }

  @Test void registerLoginAndProtectedMeWork() {
    String email="test-"+System.nanoTime()+"@example.com";
    var register=http.postForEntity("http://localhost:"+port+"/api/auth/register",Map.of("name","Test User","email",email,"password","StrongPassword123"),Map.class);
    assertThat(register.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    String token=(String)register.getBody().get("token");
    HttpHeaders headers=new HttpHeaders(); headers.setBearerAuth(token);
    var me=http.exchange("http://localhost:"+port+"/api/auth/me",HttpMethod.GET,new HttpEntity<>(headers),Map.class);
    assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(((Map<?,?>)me.getBody().get("user")).get("email")).isEqualTo(email);
  }

  @Test void unauthenticatedPostIsRejected() {
    var response=http.postForEntity("http://localhost:"+port+"/api/posts",Map.of("body","Hello world"),Map.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }
}
