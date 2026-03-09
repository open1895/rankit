import jsPDF from "jspdf";

export interface CreatorReportData {
  name: string;
  category: string;
  rank: number;
  votes_count: number;
  rankit_score: number;
  youtube_subscribers: number;
  chzzk_followers: number;
  instagram_followers: number;
  tiktok_followers: number;
  is_verified: boolean;
  rankHistory: { time: string; rank: number; votes: number }[];
  fanRanking: { nickname: string; score: number; votes: number; posts: number; comments: number }[];
  weekLabel: string;
}

export function generateWeeklyPDF(data: CreatorReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 18;
  let y = 20;

  const purple = [139, 92, 246] as [number, number, number];
  const cyan = [6, 182, 212] as [number, number, number];
  const dark = [20, 20, 35] as [number, number, number];
  const gray = [120, 120, 140] as [number, number, number];
  const white = [255, 255, 255] as [number, number, number];

  // Background
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageW, 297, "F");

  // Header gradient bar
  doc.setFillColor(...purple);
  doc.rect(0, 0, pageW, 2, "F");
  doc.setFillColor(...cyan);
  doc.rect(pageW / 2, 0, pageW / 2, 2, "F");

  // Title
  doc.setTextColor(...purple);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Rank It", margin, y);
  doc.setTextColor(...gray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Creator Influence Report", margin, y + 7);
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.text(data.weekLabel, pageW - margin, y + 7, { align: "right" });

  y += 18;

  // Creator name section
  doc.setFillColor(35, 35, 55);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 4, 4, "F");

  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.name, margin + 8, y + 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(data.category, margin + 8, y + 18);

  if (data.is_verified) {
    doc.setFillColor(...cyan);
    doc.roundedRect(pageW - margin - 40, y + 7, 32, 8, 4, 4, "F");
    doc.setTextColor(...dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Rankit Verified", pageW - margin - 24, y + 12.5, { align: "center" });
  }

  y += 36;

  // Key stats row
  const statBoxW = (pageW - margin * 2 - 8) / 4;
  const stats = [
    { label: "Current Rank", value: `#${data.rank}`, color: purple },
    { label: "Total Votes", value: data.votes_count.toLocaleString(), color: cyan },
    { label: "Rankit Score", value: Math.round(data.rankit_score).toLocaleString(), color: [99, 102, 241] as [number, number, number] },
    { label: "YouTube Subs", value: data.youtube_subscribers > 1000 ? `${(data.youtube_subscribers / 1000).toFixed(1)}K` : String(data.youtube_subscribers), color: [239, 68, 68] as [number, number, number] },
  ];

  stats.forEach((stat, i) => {
    const x = margin + i * (statBoxW + 2.5);
    doc.setFillColor(35, 35, 55);
    doc.roundedRect(x, y, statBoxW, 22, 3, 3, "F");
    doc.setTextColor(...stat.color);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x + statBoxW / 2, y + 12, { align: "center" });
    doc.setTextColor(...gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label, x + statBoxW / 2, y + 19, { align: "center" });
  });

  y += 30;

  // ══ B2B: Influence Score Breakdown ══
  const totalFollowers = data.youtube_subscribers + data.chzzk_followers + data.instagram_followers + data.tiktok_followers;
  const influenceEstimate = Math.min(100, Math.round(
    (data.youtube_subscribers * 1.5 + data.chzzk_followers * 2.0 + data.instagram_followers * 1.2 + data.tiktok_followers * 0.8) / 10000
  ));

  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Influence Score Breakdown", margin, y);
  y += 6;

  doc.setFillColor(35, 35, 55);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 3, 3, "F");
  doc.setTextColor(...purple);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${influenceEstimate}`, margin + 8, y + 13);
  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("/ 100", margin + 25, y + 13);
  doc.text(`Total Followers: ${totalFollowers.toLocaleString()}`, pageW - margin - 4, y + 13, { align: "right" });

  y += 24;

  // Platform stats
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Platform Stats", margin, y);
  y += 6;

  const platforms = [
    { label: "YouTube", value: data.youtube_subscribers, color: [239, 68, 68] as [number, number, number] },
    { label: "Chzzk", value: data.chzzk_followers, color: [34, 197, 94] as [number, number, number] },
    { label: "Instagram", value: data.instagram_followers, color: [236, 72, 153] as [number, number, number] },
    { label: "TikTok", value: data.tiktok_followers, color: [20, 184, 166] as [number, number, number] },
  ];
  const maxPlatform = Math.max(1, ...platforms.map(p => p.value));
  const barAreaW = pageW - margin * 2 - 35;

  platforms.forEach((p) => {
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(p.label, margin, y + 4);
    doc.setFillColor(40, 40, 60);
    doc.roundedRect(margin + 22, y, barAreaW, 5, 2, 2, "F");
    const barW = (p.value / maxPlatform) * barAreaW;
    if (barW > 0) {
      doc.setFillColor(...p.color);
      doc.roundedRect(margin + 22, y, barW, 5, 2, 2, "F");
    }
    doc.setTextColor(...p.color);
    doc.setFontSize(7);
    doc.text(p.value.toLocaleString(), pageW - margin, y + 4, { align: "right" });
    y += 9;
  });

  y += 4;

  // ══ B2B: Audience Reach Summary ══
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Audience Reach Summary", margin, y);
  y += 6;

  const reachData = [
    { label: "Total Cross-Platform Reach", value: totalFollowers.toLocaleString() },
    { label: "Estimated Engagement Rate", value: `${Math.min(15, Math.max(1, Math.round(data.votes_count / Math.max(1, totalFollowers) * 1000) / 10))}%` },
    { label: "Active Fan Community", value: `${data.fanRanking.length} contributors` },
    { label: "Fan Votes (Engagement Proxy)", value: data.votes_count.toLocaleString() },
  ];

  reachData.forEach((item) => {
    doc.setFillColor(35, 35, 55);
    doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, "F");
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, margin + 4, y + 7);
    doc.setTextColor(...cyan);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, pageW - margin - 4, y + 7, { align: "right" });
    y += 12;
  });

  y += 4;

  // Rank History chart
  if (data.rankHistory.length > 1) {
    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Rank History (recent)", margin, y);
    y += 6;

    const chartH = 25;
    const chartW = pageW - margin * 2;
    doc.setFillColor(35, 35, 55);
    doc.roundedRect(margin, y, chartW, chartH, 3, 3, "F");

    const last12 = data.rankHistory.slice(-12);
    const ranks = last12.map(h => h.rank);
    const minR = Math.min(...ranks);
    const maxR = Math.max(...ranks) + 1;

    last12.forEach((h, i) => {
      const px = margin + 6 + (i / (last12.length - 1)) * (chartW - 12);
      const py = y + 4 + ((h.rank - minR) / (maxR - minR)) * (chartH - 8);
      doc.setFillColor(...cyan);
      doc.circle(px, py, 1, "F");
      if (i > 0) {
        const prev = last12[i - 1];
        const ppx = margin + 6 + ((i - 1) / (last12.length - 1)) * (chartW - 12);
        const ppy = y + 4 + ((prev.rank - minR) / (maxR - minR)) * (chartH - 8);
        doc.setDrawColor(...cyan);
        doc.setLineWidth(0.5);
        doc.line(ppx, ppy, px, py);
      }
    });

    y += chartH + 6;
  }

  // Fan TOP 5
  if (data.fanRanking.length > 0) {
    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Top Fan Supporters", margin, y);
    y += 6;

    const medalColors: [number, number, number][] = [
      [255, 215, 0], [192, 192, 192], [205, 127, 50], [150, 150, 170], [130, 130, 150]
    ];

    data.fanRanking.slice(0, 5).forEach((fan, i) => {
      doc.setFillColor(35, 35, 55);
      doc.roundedRect(margin, y, pageW - margin * 2, 12, 3, 3, "F");
      doc.setTextColor(...medalColors[i]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}.`, margin + 4, y + 8);
      doc.setTextColor(...white);
      doc.setFont("helvetica", "normal");
      doc.text(fan.nickname, margin + 13, y + 8);
      doc.setTextColor(...gray);
      doc.setFontSize(7);
      doc.text(`Votes: ${fan.votes}  Posts: ${fan.posts}  Comments: ${fan.comments}`, margin + 60, y + 8);
      doc.setTextColor(...purple);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${fan.score}pts`, pageW - margin - 4, y + 8, { align: "right" });
      y += 14;
    });
  }

  // ══ B2B: Contact / Partnership CTA ══
  y = Math.max(y + 4, 260);
  doc.setFillColor(35, 35, 55);
  doc.roundedRect(margin, y, pageW - margin * 2, 16, 3, 3, "F");
  doc.setTextColor(...purple);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Partnership & Collaboration", margin + 4, y + 7);
  doc.setTextColor(...gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Contact via Rankit platform for sponsorship & brand collaboration opportunities", margin + 4, y + 13);

  // Footer
  doc.setFillColor(...purple);
  doc.rect(0, 285, pageW, 2, "F");
  doc.setTextColor(...gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated by Rank It · ${data.weekLabel} · Influence Report`, pageW / 2, 292, { align: "center" });

  doc.save(`rankit-influence-report-${data.name}-${data.weekLabel}.pdf`);
}
