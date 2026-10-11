package com.circleup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.Base64;

@SpringBootApplication
@RestController
@RequestMapping("/api")
public class CircleUpApplication implements WebMvcConfigurer {
  private final JdbcTemplate db;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);
  private final ObjectMapper json = new ObjectMapper();
  private final RestClient http = RestClient.create();
  private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder B64D = Base64.getUrlDecoder();

  public CircleUpApplication(JdbcTemplate db) { this.db = db; }
  public static void main(String[] args) { SpringApplication.run(CircleUpApplication.class, args); }

  @Override public void addCorsMappings(CorsRegistry registry) {
    String origins = System.getenv().getOrDefault("CLIENT_ORIGIN", "*");
    registry.addMapping("/api/**").allowedOriginPatterns(origins.equals("*") ? new String[]{"*"} : origins.split(","))
      .allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS").allowedHeaders("*");
  }

  private Map<String,Object> map(Object... values) {
    Map<String,Object> out = new LinkedHashMap<>();
    for (int i=0;i<values.length;i+=2) out.put((String)values[i], values[i+1]);
    return out;
  }
  private String str(Map<String,Object> body, String key) { Object v=body.get(key); return v==null?"":String.valueOf(v).trim(); }
  private long id(String value) {
    try { long n=Long.parseLong(value); if(n>0) return n; } catch(Exception ignored) {}
    throw new IllegalArgumentException("Invalid ID.");
  }
  private String secret() { return System.getenv().getOrDefault("JWT_SECRET", "local-development-only-change-this-secret-before-production"); }
  private String token(long userId, String email) {
    try {
      String head=B64.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
      String payload=B64.encodeToString(json.writeValueAsBytes(map("sub",String.valueOf(userId),"email",email,"exp",Instant.now().getEpochSecond()+604800)));
      String data=head+"."+payload;
      Mac mac=Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret().getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
      return data+"."+B64.encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    } catch(Exception e) { throw new IllegalStateException("Could not create session."); }
  }
  private long auth(String authorization) {
    try {
      if(authorization==null || !authorization.matches("(?i)^Bearer\\s+.+$")) throw new IllegalArgumentException("Sign in to continue.");
      String[] p=authorization.replaceFirst("(?i)^Bearer\\s+","").split("\\.");
      if(p.length!=3) throw new IllegalArgumentException("Session expired. Please sign in again.");
      String data=p[0]+"."+p[1]; Mac mac=Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret().getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
      if(!java.security.MessageDigest.isEqual(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)),B64D.decode(p[2]))) throw new IllegalArgumentException("Session expired. Please sign in again.");
      JsonNode payload=json.readTree(B64D.decode(p[1]));
      if(payload.path("exp").asLong(0)<Instant.now().getEpochSecond()) throw new IllegalArgumentException("Session expired. Please sign in again.");
      return id(payload.path("sub").asText());
    } catch(IllegalArgumentException e) { throw e; } catch(Exception e) { throw new IllegalArgumentException("Session expired. Please sign in again."); }
  }
  private Map<String,Object> currentUser(long id) {
    List<Map<String,Object>> rows=db.queryForList("SELECT id,name,email,interests,created_at FROM users WHERE id=?",id);
    if(rows.isEmpty()) throw new IllegalArgumentException("Account not found.");
    return rows.get(0);
  }
  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<?> badRequest(IllegalArgumentException e) {
    int status=e.getMessage()!=null && e.getMessage().toLowerCase().contains("sign in")?401:400;
    return ResponseEntity.status(status).body(map("error",e.getMessage()));
  }
  @ExceptionHandler(org.springframework.dao.DuplicateKeyException.class)
  ResponseEntity<?> conflict(Exception e) { return ResponseEntity.status(409).body(map("error","An account with this email or name already exists.")); }

  @GetMapping("/health")
  public ResponseEntity<?> health() {
    boolean postgres=System.getenv("JDBC_DATABASE_URL")!=null && !System.getenv("JDBC_DATABASE_URL").isBlank();
    boolean ai=hasAi();
    try { db.queryForObject("SELECT 1",Integer.class); }
    catch(Exception e) { return ResponseEntity.status(503).body(map("status","degraded","service","circleup-connect-api-java","database","unavailable","aiConfigured",ai)); }
    return ResponseEntity.ok(map("status",postgres?"ok":"degraded","service","circleup-connect-api-java","database",postgres?"connected":"ephemeral_h2","aiConfigured",ai,"missingConfiguration",postgres?List.of():List.of("JDBC_DATABASE_URL"),"timestamp",Instant.now().toString()));
  }

  @PostMapping("/auth/register")
  public ResponseEntity<?> register(@RequestBody Map<String,Object> b) {
    String name=str(b,"name"), email=str(b,"email").toLowerCase(Locale.ROOT), password=Objects.toString(b.get("password"),"");
    if(name.length()<2||name.length()>80) throw new IllegalArgumentException("Name must be 2–80 characters.");
    if(!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")||email.length()>254) throw new IllegalArgumentException("Enter a valid email address.");
    if(password.length()<10||password.length()>128) throw new IllegalArgumentException("Password must be 10–128 characters.");
    db.update("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)",name,email,passwords.encode(password));
    Map<String,Object> u=db.queryForMap("SELECT id,name,email,interests,created_at FROM users WHERE email=?",email);
    return ResponseEntity.status(201).body(map("user",u,"token",token(((Number)u.get("id")).longValue(),email)));
  }
  @PostMapping("/auth/login")
  public Map<String,Object> login(@RequestBody Map<String,Object> b) {
    String email=str(b,"email").toLowerCase(Locale.ROOT), password=Objects.toString(b.get("password"),"");
    List<Map<String,Object>> rows=db.queryForList("SELECT id,name,email,interests,created_at,password_hash FROM users WHERE email=?",email);
    if(rows.isEmpty()||!passwords.matches(password,Objects.toString(rows.get(0).get("password_hash"),""))) throw new IllegalArgumentException("Email or password is incorrect.");
    Map<String,Object> u=new LinkedHashMap<>(rows.get(0)); u.remove("password_hash");
    return map("user",u,"token",token(((Number)u.get("id")).longValue(),email));
  }
  @GetMapping("/auth/me") public Map<String,Object> me(@RequestHeader(value="Authorization",required=false) String h) { return map("user",currentUser(auth(h))); }

  @GetMapping("/posts")
  public Map<String,Object> posts(@RequestParam(defaultValue="30") int limit) {
    int n=Math.max(1,Math.min(limit,100));
    return map("posts",db.queryForList("SELECT p.id,p.body,p.created_at,u.id AS user_id,u.name,u.email,(SELECT COUNT(*) FROM post_likes l WHERE l.post_id=p.id) AS likes,(SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) AS comments FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT ?",n));
  }
  @PostMapping("/posts")
  public ResponseEntity<?> createPost(@RequestHeader(value="Authorization",required=false) String h,@RequestBody Map<String,Object> b) {
    long uid=auth(h); String body=str(b,"body");
    if(body.isBlank()||body.length()>500) throw new IllegalArgumentException("Post must contain 1–500 characters.");
    db.update("INSERT INTO posts(user_id,body) VALUES(?,?)",uid,body);
    return ResponseEntity.status(201).body(map("post",db.queryForMap("SELECT id,body,created_at FROM posts WHERE id=(SELECT MAX(id) FROM posts WHERE user_id=?)",uid)));
  }
  @PostMapping("/posts/{postId}/like")
  public Map<String,Object> like(@RequestHeader(value="Authorization",required=false) String h,@PathVariable String postId) {
    long uid=auth(h), pid=id(postId);
    if(db.queryForList("SELECT id FROM posts WHERE id=?",pid).isEmpty()) throw new IllegalArgumentException("Post not found.");
    if(db.update("DELETE FROM post_likes WHERE user_id=? AND post_id=?",uid,pid)>0) return map("liked",false);
    db.update("INSERT INTO post_likes(user_id,post_id) VALUES(?,?)",uid,pid); return map("liked",true);
  }
  @GetMapping("/posts/{postId}/comments")
  public Map<String,Object> comments(@PathVariable String postId) {
    return map("comments",db.queryForList("SELECT c.id,c.body,c.created_at,u.id AS user_id,u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? ORDER BY c.created_at",id(postId)));
  }
  @PostMapping("/posts/{postId}/comments")
  public ResponseEntity<?> comment(@RequestHeader(value="Authorization",required=false) String h,@PathVariable String postId,@RequestBody Map<String,Object> b) {
    long uid=auth(h),pid=id(postId); String body=str(b,"body");
    if(body.isBlank()||body.length()>1000) throw new IllegalArgumentException("Comment must contain 1–1000 characters.");
    if(db.update("INSERT INTO comments(post_id,user_id,body) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM posts WHERE id=?)",pid,uid,body,pid)==0) throw new IllegalArgumentException("Post not found.");
    return ResponseEntity.status(201).body(map("comment",db.queryForMap("SELECT id,post_id,body,created_at FROM comments WHERE id=(SELECT MAX(id) FROM comments WHERE user_id=?)",uid)));
  }
  @GetMapping("/communities")
  public Map<String,Object> communities() {
    return map("communities",db.queryForList("SELECT c.id,c.name,c.description,COUNT(cm.user_id) AS members FROM communities c LEFT JOIN community_members cm ON cm.community_id=c.id GROUP BY c.id,c.name,c.description ORDER BY c.name"));
  }
  @PostMapping("/communities/{communityId}/join")
  public Map<String,Object> join(@RequestHeader(value="Authorization",required=false) String h,@PathVariable String communityId) {
    long uid=auth(h),cid=id(communityId);
    if(db.queryForList("SELECT id FROM communities WHERE id=?",cid).isEmpty()) throw new IllegalArgumentException("Community not found.");
    if(db.update("DELETE FROM community_members WHERE user_id=? AND community_id=?",uid,cid)>0) return map("joined",false);
    db.update("INSERT INTO community_members(user_id,community_id) VALUES(?,?)",uid,cid); return map("joined",true);
  }
  @GetMapping("/messages/{userId}")
  public Map<String,Object> messages(@RequestHeader(value="Authorization",required=false) String h,@PathVariable String userId) {
    long uid=auth(h),other=id(userId);
    return map("messages",db.queryForList("SELECT id,sender_id,recipient_id,body,created_at FROM messages WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?) ORDER BY created_at LIMIT 200",uid,other,other,uid));
  }
  @PostMapping("/messages/{userId}")
  public ResponseEntity<?> sendMessage(@RequestHeader(value="Authorization",required=false) String h,@PathVariable String userId,@RequestBody Map<String,Object> b) {
    long uid=auth(h),recipient=id(userId); String body=str(b,"body");
    if(body.isBlank()||body.length()>2000) throw new IllegalArgumentException("Message must contain 1–2000 characters.");
    if(db.update("INSERT INTO messages(sender_id,recipient_id,body) SELECT ?,id,? FROM users WHERE id=?",uid,body,recipient)==0) throw new IllegalArgumentException("Recipient not found.");
    return ResponseEntity.status(201).body(map("message",db.queryForMap("SELECT id,sender_id,recipient_id,body,created_at FROM messages WHERE id=(SELECT MAX(id) FROM messages WHERE sender_id=?)",uid)));
  }
  private boolean hasAi() { return nonblank("GEMINI_API_KEY")||nonblank("OPENAI_API_KEY"); }
  private boolean nonblank(String key) { return System.getenv(key)!=null&&!System.getenv(key).isBlank(); }
  @PostMapping("/ai/chat")
  public ResponseEntity<?> ai(@RequestBody Map<String,Object> b) {
    String message=str(b,"message"); if(message.isBlank()||message.length()>4000) throw new IllegalArgumentException("Message must contain 1–4000 characters.");
    String gemini=System.getenv("GEMINI_API_KEY"), openai=System.getenv("OPENAI_API_KEY");
    try {
      if(gemini!=null&&!gemini.isBlank()) {
        String model=System.getenv().getOrDefault("GEMINI_MODEL","gemini-flash-latest");
        Map<String,Object> payload=map("contents",List.of(map("role","user","parts",List.of(map("text","You are CircleUp AI, a helpful, safe community assistant. Be concise. User message: "+message)))),"generationConfig",map("temperature",0.7,"maxOutputTokens",700));
        JsonNode result=http.post().uri("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent").header("X-goog-api-key",gemini).contentType(MediaType.APPLICATION_JSON).body(payload).retrieve().body(JsonNode.class);
        String answer=result.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
        return ResponseEntity.ok(map("answer",answer.isBlank()?"I could not generate a response just now.":answer,"model",model));
      }
      if(openai!=null&&!openai.isBlank()) {
        Map<String,Object> payload=map("model",System.getenv().getOrDefault("OPENAI_MODEL","gpt-4o-mini"),"messages",List.of(map("role","system","content","You are CircleUp AI, a helpful and safe community assistant."),map("role","user","content",message)),"max_tokens",700);
        JsonNode result=http.post().uri("https://api.openai.com/v1/chat/completions").header("Authorization","Bearer "+openai).contentType(MediaType.APPLICATION_JSON).body(payload).retrieve().body(JsonNode.class);
        return ResponseEntity.ok(map("answer",result.path("choices").path(0).path("message").path("content").asText(""),"model",result.path("model").asText()));
      }
      return ResponseEntity.status(503).body(map("error","AI is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY."));
    } catch(Exception e) { return ResponseEntity.status(502).body(map("error","AI provider request failed. Check provider configuration and retry.")); }
  }
}
