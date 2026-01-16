import jsPDF from "jspdf";
import type { Milestone } from "@/components/project/MilestoneTimeline";
import type { Risk } from "@/components/project/RiskMatrix";
import type { Issue } from "@/components/project/RAIDLog";
import type { TeamMember } from "@/components/team/TeamMemberCard";

interface ProjectReportData {
  project: {
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
    progress_percentage?: number;
  };
  tasks: { id: string; status: string }[];
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  teamMembers: TeamMember[];
}

export async function exportProjectReportToPDF(data: ProjectReportData) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const colors = {
    primary: [26, 54, 93] as [number, number, number],
    secondary: [100, 100, 100] as [number, number, number],
    success: [34, 197, 94] as [number, number, number],
    warning: [234, 179, 8] as [number, number, number],
    danger: [239, 68, 68] as [number, number, number],
    muted: [156, 163, 175] as [number, number, number],
  };

  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  const drawSectionHeader = (title: string) => {
    checkNewPage(20);
    pdf.setFillColor(245, 247, 250);
    pdf.rect(margin, yPos, pageWidth - margin * 2, 10, "F");
    pdf.setFontSize(14);
    pdf.setTextColor(...colors.primary);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, margin + 3, yPos + 7);
    yPos += 15;
  };

  // === COVER PAGE ===
  pdf.setFillColor(26, 54, 93);
  pdf.rect(0, 0, pageWidth, 80, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.project.name, margin, 40);

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.text("Project Status Report", margin, 55);

  pdf.setTextColor(...colors.secondary);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  })}`, margin, 95);

  // Project Overview Box
  yPos = 110;
  pdf.setFillColor(250, 250, 250);
  pdf.rect(margin, yPos, pageWidth - margin * 2, 45, "F");
  pdf.setDrawColor(230, 230, 230);
  pdf.rect(margin, yPos, pageWidth - margin * 2, 45, "S");

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...colors.primary);
  pdf.text("Project Overview", margin + 5, yPos + 10);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.secondary);

  const statusColor = data.project.status === "completed" ? colors.success :
    data.project.status === "on-hold" ? colors.warning : colors.primary;
  
  pdf.text(`Status: `, margin + 5, yPos + 22);
  pdf.setTextColor(...statusColor);
  pdf.text(data.project.status.toUpperCase(), margin + 22, yPos + 22);
  
  pdf.setTextColor(...colors.secondary);
  pdf.text(`Start Date: ${data.project.start_date || "Not set"}`, margin + 5, yPos + 32);
  pdf.text(`End Date: ${data.project.end_date || "Not set"}`, margin + 80, yPos + 32);
  
  const progress = data.project.progress_percentage || 0;
  pdf.text(`Progress: ${progress}%`, margin + 5, yPos + 42);

  // Progress bar
  pdf.setFillColor(230, 230, 230);
  pdf.rect(margin + 35, yPos + 38, 60, 5, "F");
  pdf.setFillColor(...colors.success);
  pdf.rect(margin + 35, yPos + 38, 60 * (progress / 100), 5, "F");

  // === TASK SUMMARY ===
  yPos = 170;
  drawSectionHeader("Task Summary");

  const taskStats = {
    total: data.tasks.length,
    completed: data.tasks.filter(t => t.status === "completed").length,
    inProgress: data.tasks.filter(t => t.status === "in-progress").length,
    pending: data.tasks.filter(t => t.status === "pending").length,
  };

  const boxWidth = (pageWidth - margin * 2 - 15) / 4;
  const boxes = [
    { label: "Total", value: taskStats.total, color: colors.primary },
    { label: "Completed", value: taskStats.completed, color: colors.success },
    { label: "In Progress", value: taskStats.inProgress, color: colors.warning },
    { label: "Pending", value: taskStats.pending, color: colors.muted },
  ];

  boxes.forEach((box, i) => {
    const x = margin + i * (boxWidth + 5);
    pdf.setFillColor(250, 250, 250);
    pdf.rect(x, yPos, boxWidth, 25, "F");
    pdf.setDrawColor(...box.color);
    pdf.setLineWidth(0.5);
    pdf.line(x, yPos, x, yPos + 25);

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...box.color);
    pdf.text(String(box.value), x + 5, yPos + 12);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.secondary);
    pdf.text(box.label, x + 5, yPos + 20);
  });

  yPos += 35;

  // === MILESTONES ===
  drawSectionHeader(`Milestones (${data.milestones.length})`);

  if (data.milestones.length === 0) {
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.muted);
    pdf.text("No milestones defined", margin, yPos);
    yPos += 10;
  } else {
    data.milestones.forEach((milestone) => {
      checkNewPage(20);

      const statusColors: Record<string, [number, number, number]> = {
        completed: colors.success,
        upcoming: colors.primary,
        at_risk: colors.warning,
        missed: colors.danger,
      };

      pdf.setFillColor(252, 252, 252);
      pdf.rect(margin, yPos, pageWidth - margin * 2, 15, "F");

      // Status indicator
      pdf.setFillColor(...(statusColors[milestone.status] || colors.muted));
      pdf.circle(margin + 4, yPos + 7.5, 2, "F");

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.primary);
      pdf.text(milestone.title, margin + 10, yPos + 6);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...colors.secondary);
      pdf.text(`Target: ${milestone.target_date}`, margin + 10, yPos + 12);
      
      pdf.setTextColor(...(statusColors[milestone.status] || colors.muted));
      pdf.text(milestone.status.replace("_", " ").toUpperCase(), pageWidth - margin - 25, yPos + 9);

      yPos += 18;
    });
  }

  yPos += 5;

  // === RISKS ===
  checkNewPage(50);
  drawSectionHeader(`Risks (${data.risks.length})`);

  const openRisks = data.risks.filter(r => r.status === "Open" || r.status === "Mitigating");

  if (openRisks.length === 0) {
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.muted);
    pdf.text("No open risks", margin, yPos);
    yPos += 10;
  } else {
    openRisks.slice(0, 5).forEach((risk) => {
      checkNewPage(25);

      const impactColors: Record<string, [number, number, number]> = {
        high: colors.danger,
        medium: colors.warning,
        low: colors.success,
      };

      pdf.setFillColor(252, 252, 252);
      pdf.rect(margin, yPos, pageWidth - margin * 2, 20, "F");

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.primary);
      pdf.text(risk.title.substring(0, 50) + (risk.title.length > 50 ? "..." : ""), margin + 5, yPos + 7);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.secondary);
      pdf.text(`Likelihood: ${risk.likelihood} | Impact: ${risk.impact}`, margin + 5, yPos + 14);

      // Impact badge
      pdf.setFillColor(...(impactColors[risk.impact] || colors.muted));
      pdf.roundedRect(pageWidth - margin - 20, yPos + 4, 15, 6, 1, 1, "F");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(risk.impact.toUpperCase(), pageWidth - margin - 18, yPos + 8.5);

      yPos += 23;
    });

    if (openRisks.length > 5) {
      pdf.setFontSize(9);
      pdf.setTextColor(...colors.muted);
      pdf.text(`+ ${openRisks.length - 5} more risks...`, margin, yPos);
      yPos += 10;
    }
  }

  yPos += 5;

  // === ISSUES ===
  checkNewPage(50);
  drawSectionHeader(`Issues (${data.issues.length})`);

  const openIssues = data.issues.filter(i => i.status !== "Resolved");

  if (openIssues.length === 0) {
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.muted);
    pdf.text("No open issues", margin, yPos);
    yPos += 10;
  } else {
    openIssues.slice(0, 5).forEach((issue) => {
      checkNewPage(25);

      const priorityColors: Record<string, [number, number, number]> = {
        critical: colors.danger,
        high: [249, 115, 22],
        medium: colors.warning,
        low: colors.success,
      };

      pdf.setFillColor(252, 252, 252);
      pdf.rect(margin, yPos, pageWidth - margin * 2, 20, "F");

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.primary);
      pdf.text(issue.title.substring(0, 50) + (issue.title.length > 50 ? "..." : ""), margin + 5, yPos + 7);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.secondary);
      pdf.text(`Status: ${issue.status} | Target: ${issue.target_resolution_date || "Not set"}`, margin + 5, yPos + 14);

      // Priority badge
      pdf.setFillColor(...(priorityColors[issue.priority] || colors.muted));
      pdf.roundedRect(pageWidth - margin - 22, yPos + 4, 17, 6, 1, 1, "F");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(issue.priority.toUpperCase(), pageWidth - margin - 20, yPos + 8.5);

      yPos += 23;
    });

    if (openIssues.length > 5) {
      pdf.setFontSize(9);
      pdf.setTextColor(...colors.muted);
      pdf.text(`+ ${openIssues.length - 5} more issues...`, margin, yPos);
      yPos += 10;
    }
  }

  // === TEAM ===
  pdf.addPage();
  yPos = margin;
  drawSectionHeader(`Team Members (${data.teamMembers.length})`);

  if (data.teamMembers.length === 0) {
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.muted);
    pdf.text("No team members assigned", margin, yPos);
  } else {
    const colWidth = (pageWidth - margin * 2) / 2;

    data.teamMembers.forEach((member, i) => {
      checkNewPage(25);

      const x = margin + (i % 2) * colWidth;
      if (i % 2 === 0 && i > 0) yPos += 25;

      pdf.setFillColor(250, 250, 250);
      pdf.rect(x, yPos, colWidth - 5, 22, "F");

      // Avatar circle
      pdf.setFillColor(...colors.primary);
      pdf.circle(x + 8, yPos + 11, 6, "F");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      const initials = member.name.split(" ").map(n => n[0]).join("").substring(0, 2);
      pdf.text(initials, x + 5.5, yPos + 13);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.primary);
      pdf.text(member.name, x + 18, yPos + 9);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.secondary);
      pdf.text(`${member.role} • ${member.level}`, x + 18, yPos + 16);
    });
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.text(
      `${data.project.name} - Project Report | Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 8
    );
    pdf.text(
      "Generated by Consulting Workbench",
      pageWidth - margin - 45,
      pageHeight - 8
    );
  }

  // Save the PDF
  pdf.save(`${data.project.name.replace(/\s+/g, "_")}_Report.pdf`);
}
