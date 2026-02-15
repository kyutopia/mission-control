/**
 * Discord Webhook integration for task status changes
 */

const STATUS_LABELS: Record<string, string> = {
  planning: '📋 기획',
  inbox: '📥 수신함',
  assigned: '📌 배정',
  in_progress: '🔨 진행중',
  testing: '🧪 테스트',
  review: '🔍 검토',
  done: '✅ 완료',
};

const STATUS_COLORS: Record<string, number> = {
  planning: 0x9333ea,
  inbox: 0xec4899,
  assigned: 0xeab308,
  in_progress: 0x3b82f6,
  testing: 0x06b6d4,
  review: 0xa855f7,
  done: 0x22c55e,
};

export async function sendDiscordStatusNotification(params: {
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  assignedAgentName?: string;
  taskId: string;
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return; // graceful skip

  try {
    const { taskTitle, oldStatus, newStatus, assignedAgentName, taskId } = params;
    const now = new Date().toISOString();

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '📡 태스크 상태 변경',
          description: `**${taskTitle}**`,
          color: STATUS_COLORS[newStatus] || 0x6b7280,
          fields: [
            { name: '상태', value: `${STATUS_LABELS[oldStatus] || oldStatus} → ${STATUS_LABELS[newStatus] || newStatus}`, inline: true },
            { name: '담당자', value: assignedAgentName || '미배정', inline: true },
          ],
          footer: { text: `Task ID: ${taskId}` },
          timestamp: now,
        }],
      }),
    });
  } catch {
    // Silently ignore webhook errors
  }
}
