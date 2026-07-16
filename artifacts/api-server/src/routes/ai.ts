import { Router } from "express";
import { db } from "@workspace/db";
import { aiConversationsTable, aiMessagesTable, serversTable, templatesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();
router.use(authMiddleware);

// Simulated AI responses
const AI_RESPONSES: Record<string, string> = {
  default: `As your Infrastructure Copilot, I've analyzed your request.

**Assessment:**
I've examined the target system and current configuration to provide the following guidance.

**Recommendation:**
Before proceeding with any changes, I recommend:

1. **Backup current configuration** — always snapshot before infrastructure changes
2. **Verify prerequisites** — ensure disk space, memory, and network connectivity
3. **Test in staging first** — validate changes in a non-production environment

**Command sequence for verification:**
\`\`\`bash
# Check system resources
df -h && free -m && uptime

# Verify network connectivity
ping -c 3 8.8.8.8 && curl -I https://packages.example.com

# Check running services
systemctl list-units --state=running --type=service
\`\`\`

**Risk Assessment:** Medium — standard procedure with established rollback path.

**Estimated time:** 15-30 minutes
**Rollback strategy:** Restore from pre-change snapshot

What specific aspect would you like me to analyze in more detail?`,
};

function generateAiResponse(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("nginx") || msg.includes("web server")) {
    return `**Nginx Installation Analysis**

I've analyzed your infrastructure for Nginx deployment.

**System Requirements Check:**
- Minimum RAM: 512MB ✓
- Ports required: 80, 443
- Dependencies: OpenSSL, PCRE, zlib

**Recommended Installation Steps:**
\`\`\`bash
# Update package repositories
apt-get update -y

# Install Nginx with common modules
apt-get install -y nginx nginx-extras ssl-cert

# Enable and start service
systemctl enable nginx && systemctl start nginx

# Verify installation
nginx -v && systemctl status nginx
\`\`\`

**Security Hardening:**
\`\`\`nginx
# /etc/nginx/nginx.conf additions
server_tokens off;
add_header X-Frame-Options SAMEORIGIN;
add_header X-Content-Type-Options nosniff;
ssl_protocols TLSv1.2 TLSv1.3;
\`\`\`

**Post-installation validation:**
- Test configuration: \`nginx -t\`
- Check port listening: \`ss -tlnp | grep ':80'\ \`
- Verify SSL: \`openssl s_client -connect localhost:443\`

**Estimated time:** 10-15 minutes | **Risk:** Low | **Rollback:** \`apt-get remove nginx\``;
  }
  if (msg.includes("docker")) {
    return `**Docker Installation Plan**

**Pre-installation Assessment:**
\`\`\`bash
# Check kernel compatibility
uname -r  # Requires 3.10+

# Verify no conflicting packages
dpkg -l | grep -E "docker|containerd"

# Check available disk space (min 10GB recommended)
df -h /var/lib/docker
\`\`\`

**Installation Procedure:**
\`\`\`bash
# Remove old versions
apt-get remove -y docker docker-engine docker.io containerd runc

# Install dependencies
apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key and repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Install Docker Engine
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable
systemctl enable docker && systemctl start docker

# Verify
docker run hello-world
\`\`\`

**Post-install:** Add your user to docker group: \`usermod -aG docker $USER\`

**Risk:** Low | **Estimated time:** 20 minutes`;
  }
  if (msg.includes("troubleshoot") || msg.includes("error") || msg.includes("failed")) {
    return `**Troubleshooting Analysis**

I've analyzed the issue pattern. Here's my diagnostic approach:

**Step 1: Check system logs**
\`\`\`bash
# System journal (last 100 entries)
journalctl -xe --no-pager -n 100

# Service-specific logs
journalctl -u <service-name> --since "1 hour ago"

# Application logs
tail -100 /var/log/syslog
\`\`\`

**Step 2: Resource check**
\`\`\`bash
# CPU and memory pressure
top -bn1 | head -20
vmstat 1 5

# Disk I/O
iostat -x 1 5
df -h
\`\`\`

**Step 3: Network diagnostics**
\`\`\`bash
# Port connectivity
ss -tlnp
netstat -an | grep LISTEN

# DNS resolution
dig @8.8.8.8 yourdomain.com
nslookup yourdomain.com
\`\`\`

**Common root causes:**
1. Resource exhaustion (disk/memory)
2. Service dependency failure
3. Permission issues
4. Configuration syntax errors
5. Network/firewall blocking

Please share the specific error message or logs for more targeted analysis.`;
  }
  return AI_RESPONSES["default"] ?? "";
}

router.post("/organizations/:orgId/ai/chat", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const user = getUser(req);
  const { message, conversationId } = req.body;

  let convId = conversationId;
  if (!convId) {
    const title = message.length > 60 ? message.substring(0, 60) + "..." : message;
    const [conv] = await db.insert(aiConversationsTable).values({
      orgId, userId: user.id, title, lastMessageAt: new Date(),
    }).returning();
    convId = conv?.id;
  } else {
    await db.update(aiConversationsTable).set({ lastMessageAt: new Date() }).where(eq(aiConversationsTable.id, convId));
  }

  await db.insert(aiMessagesTable).values({ conversationId: convId, role: "user", content: message });
  const aiText = generateAiResponse(message);
  await db.insert(aiMessagesTable).values({ conversationId: convId, role: "assistant", content: aiText });

  res.json({
    message: aiText,
    conversationId: convId,
    reasoning: "Analyzed request against infrastructure knowledge base and best practices.",
    recommendations: ["Always backup before changes", "Test in staging first", "Monitor after deployment"],
    codeBlocks: [],
  });
});

router.get("/organizations/:orgId/ai/conversations", async (req, res) => {
  const orgId = parseInt(req.params["orgId"] ?? "0");
  const user = getUser(req);
  const convs = await db.select().from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.orgId, orgId), eq(aiConversationsTable.userId, user.id)))
    .orderBy(desc(aiConversationsTable.lastMessageAt));
  const result = await Promise.all(convs.map(async (c) => {
    const msgs = await db.select().from(aiMessagesTable).where(eq(aiMessagesTable.conversationId, c.id));
    return { ...c, messageCount: msgs.length };
  }));
  res.json(result);
});

router.get("/organizations/:orgId/ai/conversations/:conversationId", async (req, res) => {
  const conversationId = parseInt(req.params["conversationId"] ?? "0");
  const [conv] = await db.select().from(aiConversationsTable).where(eq(aiConversationsTable.id, conversationId)).limit(1);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const messages = await db.select().from(aiMessagesTable).where(eq(aiMessagesTable.conversationId, conversationId));
  res.json({ ...conv, messages });
});

router.delete("/organizations/:orgId/ai/conversations/:conversationId", async (req, res) => {
  const conversationId = parseInt(req.params["conversationId"] ?? "0");
  await db.delete(aiConversationsTable).where(eq(aiConversationsTable.id, conversationId));
  res.status(204).end();
});

router.post("/organizations/:orgId/ai/analyze-deployment", async (req, res) => {
  const { serverId, templateId } = req.body;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId)).limit(1);
  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, templateId)).limit(1);
  res.json({
    summary: `Deploy ${template?.name ?? "software"} on ${server?.name ?? "target server"}`,
    whyRequired: "Required to provision the requested software component.",
    benefits: ["Automated with rollback support", "Pre-validated", "Audited"],
    risks: [{ description: "Brief service interruption", severity: "low", mitigation: "Schedule during off-peak hours" }],
    dependencies: ["Package repos accessible", "2GB disk space", "Required ports open"],
    estimatedDuration: 300,
    estimatedDowntime: 30,
    requiredPorts: [80, 443],
    requiredPackages: ["curl", "wget"],
    backupRecommendations: ["Snapshot VM", "Backup config files"],
    rollbackStrategy: "Restore from pre-deployment snapshot.",
    expectedOutcome: "Software installed and service running.",
    steps: (template?.steps ?? []).map((s: any) => ({
      order: s.order,
      name: s.name,
      description: s.description ?? "",
      command: s.command,
      whyRequired: "Required step",
      estimatedSeconds: s.estimatedSeconds ?? 30,
      rollbackCommand: "",
    })),
  });
});

router.post("/organizations/:orgId/ai/troubleshoot", async (req, res) => {
  const { description } = req.body;
  res.json({
    rootCause: "Service dependency failure or resource constraint detected",
    explanation: `Based on the description "${description}", this appears to be related to a service configuration issue or resource exhaustion. The pattern matches common infrastructure problems seen in similar environments.`,
    severity: "medium",
    recommendations: [
      { action: "Check system logs", command: "journalctl -xe --no-pager -n 200", explanation: "Review recent system events for error patterns" },
      { action: "Verify service status", command: "systemctl status <service>", explanation: "Confirm the service state and recent failures" },
      { action: "Check disk space", command: "df -h && du -sh /var/log/*", explanation: "Disk exhaustion is a common cause of service failures" },
      { action: "Review memory usage", command: "free -m && ps aux --sort=-%mem | head -10", explanation: "Memory pressure can cause OOM kills" },
    ],
  });
});

export default router;
