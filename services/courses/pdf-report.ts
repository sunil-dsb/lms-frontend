/**
 * Client-side pure TypeScript PDF generator for LMS Training & Compliance Reports.
 * Generates standard PDF 1.4 documents without any third-party dependencies.
 */

import type {
  EmployeeProgressRow,
  CourseProgressRow,
  TrainingProgressSummary,
} from "@/lib/types";

interface PdfReportOptions {
  locale: string;
  groupBy: "employee" | "course";
  summary?: TrainingProgressSummary;
  employees: EmployeeProgressRow[];
  courses: CourseProgressRow[];
}

export function generateCompliancePdf(options: PdfReportOptions): Uint8Array {
  const { locale, groupBy, summary, employees, courses } = options;
  const isEs = locale === "es";

  // Page dimensions (Letter Landscape: 792 x 612 pt)
  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2; // 712 pt

  // We chunk data across pages: ~20 rows per page
  const rowsPerPage = 18;
  const totalItems = groupBy === "employee" ? employees.length : courses.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  // Objects in the PDF
  const objects: string[] = [];

  // Helper to escape text for PDF literal strings ( )
  const sanitizeText = (text: string | number | null | undefined): string => {
    if (text === null || text === undefined) return "";
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E]/g, (char) => {
        // Map common Spanish accented characters to ASCII equivalents for standard Helvetica font
        const map: Record<string, string> = {
          "\u00e1": "a",
          "\u00e9": "e",
          "\u00ed": "i",
          "\u00f3": "o",
          "\u00fa": "u",
          "\u00f1": "n",
          "\u00c1": "A",
          "\u00c9": "E",
          "\u00cd": "I",
          "\u00d3": "O",
          "\u00da": "U",
          "\u00d1": "N",
          "\u00fc": "u",
          "\u00dc": "U",
          "\u00bf": "",
          "\u00a1": "",
          "\u2014": "-",
          "\u2013": "-",
          "\u00b7": "-",
        };
        return map[char] ?? "";
      });
  };

  const today = new Date().toISOString().slice(0, 10);
  const title = isEs
    ? "Informe de Capacitacion y Cumplimiento"
    : "Training & Compliance Progress Report";
  const orgName = "Alimentaria Mexicana";

  // Build pages
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  // 1: Catalog, 2: Pages container
  // 3: Font Helvetica, 4: Font Helvetica-Bold
  // Page objects will start at 5

  const pageStartIndex = 5;

  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    const pageObjId = pageStartIndex + pageIdx * 2;
    const contentObjId = pageStartIndex + pageIdx * 2 + 1;
    pageObjectIds.push(pageObjId);
    contentObjectIds.push(contentObjId);

    // Build page stream
    const streamCommands: string[] = [];

    // Header Branding & Title
    streamCommands.push("BT");
    streamCommands.push("/F2 16 Tf"); // Helvetica-Bold 16pt
    streamCommands.push(`40 570 Td (${sanitizeText(orgName)}) Tj`);
    streamCommands.push("/F1 11 Tf"); // Helvetica 11pt
    streamCommands.push(`0 -18 Td (${sanitizeText(title)} | ${today}) Tj`);
    streamCommands.push("ET");

    // Summary KPI banner on first page
    if (pageIdx === 0 && summary) {
      // Draw banner background rectangle
      streamCommands.push("0.96 0.96 0.97 rg"); // Light background
      streamCommands.push("40 515 712 24 re f");

      const kpiText = isEs
        ? `Total: ${totalItems}   |   Completados: ${summary.completed}   |   En progreso: ${summary.inProgress}   |   Vencidos: ${summary.overdue}   |   Restringidos (Bloqueados): ${summary.restricted ?? 0}`
        : `Total: ${totalItems}   |   Completed: ${summary.completed}   |   In Progress: ${summary.inProgress}   |   Overdue: ${summary.overdue}   |   Restricted (Locked): ${summary.restricted ?? 0}`;

      streamCommands.push("BT");
      streamCommands.push("/F2 9 Tf");
      streamCommands.push("0.15 0.15 0.2 rg"); // Dark text
      streamCommands.push(`50 523 Td (${sanitizeText(kpiText)}) Tj`);
      streamCommands.push("ET");
    }

    // Table Header
    const tableTop = pageIdx === 0 && summary ? 495 : 530;

    // Header row background
    streamCommands.push("0.9 0.91 0.93 rg");
    streamCommands.push(`40 ${tableTop - 16} 712 18 re f`);

    streamCommands.push("BT");
    streamCommands.push("/F2 9 Tf");
    streamCommands.push("0.1 0.1 0.1 rg");

    if (groupBy === "employee") {
      // Col positions: Name (45), Email (200), Station (340), Req Done (430), All Done (510), Status (580), Restricted (660)
      streamCommands.push(
        `45 ${tableTop - 12} Td (${sanitizeText(isEs ? "Empleado" : "Employee Name")}) Tj`,
      );
      streamCommands.push(
        `155 0 Td (${sanitizeText(isEs ? "Correo" : "Email")}) Tj`,
      );
      streamCommands.push(
        `140 0 Td (${sanitizeText(isEs ? "Estacion" : "Station")}) Tj`,
      );
      streamCommands.push(
        `90 0 Td (${sanitizeText(isEs ? "Requeridos" : "Required")}) Tj`,
      );
      streamCommands.push(
        `80 0 Td (${sanitizeText(isEs ? "Total Hecho" : "Total Done")}) Tj`,
      );
      streamCommands.push(
        `70 0 Td (${sanitizeText(isEs ? "Estado" : "Status")}) Tj`,
      );
      streamCommands.push(
        `80 0 Td (${sanitizeText(isEs ? "Bloqueado" : "Restricted")}) Tj`,
      );
    } else {
      streamCommands.push(
        `45 ${tableTop - 12} Td (${sanitizeText(isEs ? "Curso (EN)" : "Course Title (EN)")}) Tj`,
      );
      streamCommands.push(
        `240 0 Td (${sanitizeText(isEs ? "Curso (ES)" : "Course Title (ES)")}) Tj`,
      );
      streamCommands.push(
        `240 0 Td (${sanitizeText(isEs ? "Completados" : "People Done")}) Tj`,
      );
      streamCommands.push(
        `90 0 Td (${sanitizeText(isEs ? "Asignados" : "Assigned")}) Tj`,
      );
      streamCommands.push(
        `60 0 Td (${sanitizeText(isEs ? "Estado" : "Status")}) Tj`,
      );
    }
    streamCommands.push("ET");

    // Table Rows
    const startRow = pageIdx * rowsPerPage;
    const endRow = Math.min(startRow + rowsPerPage, totalItems);
    let rowY = tableTop - 34;

    for (let r = startRow; r < endRow; r++) {
      // Alternating row background
      if ((r - startRow) % 2 === 1) {
        streamCommands.push("0.98 0.98 0.99 rg");
        streamCommands.push(`40 ${rowY - 4} 712 18 re f`);
      }

      // Border line below each row
      streamCommands.push("0.9 0.9 0.92 RG");
      streamCommands.push("0.5 w");
      streamCommands.push(`40 ${rowY - 4} m 752 ${rowY - 4} l S`);

      streamCommands.push("BT");
      streamCommands.push("/F1 8.5 Tf");
      streamCommands.push("0.2 0.2 0.2 rg");

      if (groupBy === "employee") {
        const emp = employees[r];
        if (!emp) break;

        const reqDone = `${emp.requiredCoursesDone ?? 0} / ${emp.requiredCoursesTotal ?? 0}`;
        const allDone = `${emp.coursesDone} / ${emp.coursesTotal}`;
        const isRestrictedText = emp.isRestricted
          ? isEs
            ? "SI"
            : "YES"
          : isEs
            ? "NO"
            : "NO";

        // Format status label
        const statusLabel =
          emp.status === "complete"
            ? isEs
              ? "Hecho"
              : "Done"
            : emp.status === "overdue"
              ? isEs
                ? "Vencido"
                : "Overdue"
              : emp.status === "restricted"
                ? isEs
                  ? "Restringido"
                  : "Restricted"
                : emp.status === "due_soon"
                  ? isEs
                    ? "Vence pronto"
                    : "Due soon"
                  : emp.status === "in_progress"
                    ? isEs
                      ? "En progreso"
                      : "In progress"
                    : isEs
                      ? "No iniciado"
                      : "Not started";

        streamCommands.push(
          `45 ${rowY} Td (${sanitizeText(emp.name.slice(0, 24))}) Tj`,
        );
        streamCommands.push(
          `155 0 Td (${sanitizeText((emp.email || "").slice(0, 22))}) Tj`,
        );
        streamCommands.push(
          `140 0 Td (${sanitizeText((emp.station || "").slice(0, 14))}) Tj`,
        );
        streamCommands.push(`90 0 Td (${sanitizeText(reqDone)}) Tj`);
        streamCommands.push(`80 0 Td (${sanitizeText(allDone)}) Tj`);

        // Status with highlight tone
        if (
          emp.isRestricted ||
          emp.status === "overdue" ||
          emp.status === "restricted"
        ) {
          streamCommands.push("/F2 8.5 Tf 0.8 0.1 0.1 rg"); // Red for overdue/restricted
        } else if (emp.status === "complete") {
          streamCommands.push("/F2 8.5 Tf 0.1 0.6 0.2 rg"); // Green for complete
        }
        streamCommands.push(`70 0 Td (${sanitizeText(statusLabel)}) Tj`);

        // Restricted
        if (emp.isRestricted) {
          streamCommands.push("/F2 8.5 Tf 0.85 0.1 0.1 rg");
        } else {
          streamCommands.push("/F1 8.5 Tf 0.4 0.4 0.4 rg");
        }
        streamCommands.push(`80 0 Td (${sanitizeText(isRestrictedText)}) Tj`);
      } else {
        const c = courses[r];
        if (!c) break;
        const statusLabel =
          c.status === "complete"
            ? isEs
              ? "Hecho"
              : "Done"
            : c.status === "overdue"
              ? isEs
                ? "Vencido"
                : "Overdue"
              : isEs
                ? "En progreso"
                : "In progress";

        streamCommands.push(
          `45 ${rowY} Td (${sanitizeText(c.course.titleEn.slice(0, 36))}) Tj`,
        );
        streamCommands.push(
          `240 0 Td (${sanitizeText(c.course.titleEs.slice(0, 36))}) Tj`,
        );
        streamCommands.push(`240 0 Td (${sanitizeText(c.peopleDone)}) Tj`);
        streamCommands.push(`90 0 Td (${sanitizeText(c.peopleTotal)}) Tj`);
        streamCommands.push(`60 0 Td (${sanitizeText(statusLabel)}) Tj`);
      }

      streamCommands.push("ET");
      rowY -= 18;
    }

    // Page Footer
    streamCommands.push("BT");
    streamCommands.push("/F1 8 Tf");
    streamCommands.push("0.5 0.5 0.5 rg");
    const footerText = `${isEs ? "Pagina" : "Page"} ${pageIdx + 1} / ${pageCount} - Alimentaria Mexicana LMS`;
    streamCommands.push(`40 22 Td (${sanitizeText(footerText)}) Tj`);
    streamCommands.push("ET");
  }

  // Assemble full PDF
  // Obj 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Obj 2: Pages list
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageCount} >>\nendobj\n`,
  );

  // Obj 3: Font Helvetica
  objects.push(
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
  );

  // Obj 4: Font Helvetica-Bold
  objects.push(
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
  );

  // Page objects & Content stream objects
  for (let i = 0; i < pageCount; i++) {
    const pageObjId = pageObjectIds[i];
    const contentObjId = contentObjectIds[i];

    // Page obj
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjId} 0 R >>\nendobj\n`,
    );

    // Reconstruct stream commands for this page
    const pageCommands: string[] = [];

    // Header Branding & Title
    pageCommands.push("BT");
    pageCommands.push("/F2 16 Tf");
    pageCommands.push(`40 570 Td (${sanitizeText(orgName)}) Tj`);
    pageCommands.push("/F1 11 Tf");
    pageCommands.push(`0 -18 Td (${sanitizeText(title)} | ${today}) Tj`);
    pageCommands.push("ET");

    // Summary KPI banner
    if (i === 0 && summary) {
      pageCommands.push("0.96 0.96 0.97 rg");
      pageCommands.push("40 515 712 24 re f");

      const kpiText = isEs
        ? `Total: ${totalItems}   |   Completados: ${summary.completed}   |   En progreso: ${summary.inProgress}   |   Vencidos: ${summary.overdue}   |   Restringidos (Bloqueados): ${summary.restricted ?? 0}`
        : `Total: ${totalItems}   |   Completed: ${summary.completed}   |   In Progress: ${summary.inProgress}   |   Overdue: ${summary.overdue}   |   Restricted (Locked): ${summary.restricted ?? 0}`;

      pageCommands.push("BT");
      pageCommands.push("/F2 9 Tf");
      pageCommands.push("0.15 0.15 0.2 rg");
      pageCommands.push(`50 523 Td (${sanitizeText(kpiText)}) Tj`);
      pageCommands.push("ET");
    }

    const tableTop = i === 0 && summary ? 495 : 530;
    pageCommands.push("0.9 0.91 0.93 rg");
    pageCommands.push(`40 ${tableTop - 16} 712 18 re f`);

    pageCommands.push("BT");
    pageCommands.push("/F2 9 Tf");
    pageCommands.push("0.1 0.1 0.1 rg");

    if (groupBy === "employee") {
      pageCommands.push(
        `45 ${tableTop - 12} Td (${sanitizeText(isEs ? "Empleado" : "Employee Name")}) Tj`,
      );
      pageCommands.push(
        `155 0 Td (${sanitizeText(isEs ? "Correo" : "Email")}) Tj`,
      );
      pageCommands.push(
        `140 0 Td (${sanitizeText(isEs ? "Estacion" : "Station")}) Tj`,
      );
      pageCommands.push(
        `90 0 Td (${sanitizeText(isEs ? "Requeridos" : "Required")}) Tj`,
      );
      pageCommands.push(
        `80 0 Td (${sanitizeText(isEs ? "Total Hecho" : "Total Done")}) Tj`,
      );
      pageCommands.push(
        `70 0 Td (${sanitizeText(isEs ? "Estado" : "Status")}) Tj`,
      );
      pageCommands.push(
        `80 0 Td (${sanitizeText(isEs ? "Bloqueado" : "Restricted")}) Tj`,
      );
    } else {
      pageCommands.push(
        `45 ${tableTop - 12} Td (${sanitizeText(isEs ? "Curso (EN)" : "Course Title (EN)")}) Tj`,
      );
      pageCommands.push(
        `240 0 Td (${sanitizeText(isEs ? "Curso (ES)" : "Course Title (ES)")}) Tj`,
      );
      pageCommands.push(
        `240 0 Td (${sanitizeText(isEs ? "Completados" : "People Done")}) Tj`,
      );
      pageCommands.push(
        `90 0 Td (${sanitizeText(isEs ? "Asignados" : "Assigned")}) Tj`,
      );
      pageCommands.push(
        `60 0 Td (${sanitizeText(isEs ? "Estado" : "Status")}) Tj`,
      );
    }
    pageCommands.push("ET");

    const startRow = i * rowsPerPage;
    const endRow = Math.min(startRow + rowsPerPage, totalItems);
    let rowY = tableTop - 34;

    for (let r = startRow; r < endRow; r++) {
      if ((r - startRow) % 2 === 1) {
        pageCommands.push("0.98 0.98 0.99 rg");
        pageCommands.push(`40 ${rowY - 4} 712 18 re f`);
      }
      pageCommands.push("0.9 0.9 0.92 RG");
      pageCommands.push("0.5 w");
      pageCommands.push(`40 ${rowY - 4} m 752 ${rowY - 4} l S`);

      pageCommands.push("BT");
      pageCommands.push("/F1 8.5 Tf");
      pageCommands.push("0.2 0.2 0.2 rg");

      if (groupBy === "employee") {
        const emp = employees[r];
        if (!emp) break;
        const reqDone = `${emp.requiredCoursesDone ?? 0} / ${emp.requiredCoursesTotal ?? 0}`;
        const allDone = `${emp.coursesDone} / ${emp.coursesTotal}`;
        const isRestrictedText = emp.isRestricted
          ? isEs
            ? "SI"
            : "YES"
          : isEs
            ? "NO"
            : "NO";

        const statusLabel =
          emp.status === "complete"
            ? isEs
              ? "Hecho"
              : "Done"
            : emp.status === "overdue"
              ? isEs
                ? "Vencido"
                : "Overdue"
              : emp.status === "restricted"
                ? isEs
                  ? "Restringido"
                  : "Restricted"
                : emp.status === "due_soon"
                  ? isEs
                    ? "Vence pronto"
                    : "Due soon"
                  : emp.status === "in_progress"
                    ? isEs
                      ? "En progreso"
                      : "In progress"
                    : isEs
                      ? "No iniciado"
                      : "Not started";

        pageCommands.push(
          `45 ${rowY} Td (${sanitizeText(emp.name.slice(0, 24))}) Tj`,
        );
        pageCommands.push(
          `155 0 Td (${sanitizeText((emp.email || "").slice(0, 22))}) Tj`,
        );
        pageCommands.push(
          `140 0 Td (${sanitizeText((emp.station || "").slice(0, 14))}) Tj`,
        );
        pageCommands.push(`90 0 Td (${sanitizeText(reqDone)}) Tj`);
        pageCommands.push(`80 0 Td (${sanitizeText(allDone)}) Tj`);

        if (
          emp.isRestricted ||
          emp.status === "overdue" ||
          emp.status === "restricted"
        ) {
          pageCommands.push("/F2 8.5 Tf 0.8 0.1 0.1 rg");
        } else if (emp.status === "complete") {
          pageCommands.push("/F2 8.5 Tf 0.1 0.6 0.2 rg");
        }
        pageCommands.push(`70 0 Td (${sanitizeText(statusLabel)}) Tj`);

        if (emp.isRestricted) {
          pageCommands.push("/F2 8.5 Tf 0.85 0.1 0.1 rg");
        } else {
          pageCommands.push("/F1 8.5 Tf 0.4 0.4 0.4 rg");
        }
        pageCommands.push(`80 0 Td (${sanitizeText(isRestrictedText)}) Tj`);
      } else {
        const c = courses[r];
        if (!c) break;
        const statusLabel =
          c.status === "complete"
            ? isEs
              ? "Hecho"
              : "Done"
            : c.status === "overdue"
              ? isEs
                ? "Vencido"
                : "Overdue"
              : isEs
                ? "En progreso"
                : "In progress";

        pageCommands.push(
          `45 ${rowY} Td (${sanitizeText(c.course.titleEn.slice(0, 36))}) Tj`,
        );
        pageCommands.push(
          `240 0 Td (${sanitizeText(c.course.titleEs.slice(0, 36))}) Tj`,
        );
        pageCommands.push(`240 0 Td (${sanitizeText(c.peopleDone)}) Tj`);
        pageCommands.push(`90 0 Td (${sanitizeText(c.peopleTotal)}) Tj`);
        pageCommands.push(`60 0 Td (${sanitizeText(statusLabel)}) Tj`);
      }

      pageCommands.push("ET");
      rowY -= 18;
    }

    pageCommands.push("BT");
    pageCommands.push("/F1 8 Tf");
    pageCommands.push("0.5 0.5 0.5 rg");
    const footerText = `${isEs ? "Pagina" : "Page"} ${i + 1} / ${pageCount} - Alimentaria Mexicana LMS`;
    pageCommands.push(`40 22 Td (${sanitizeText(footerText)}) Tj`);
    pageCommands.push("ET");

    const streamData = pageCommands.join("\n");
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream\nendobj\n`,
    );
  }

  // Calculate xref table
  let pdfContent = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdfContent.length);
    pdfContent += objects[i];
  }

  const xrefOffset = pdfContent.length;
  pdfContent += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const offset = offsets[i] ?? 0;
    const padded = String(offset).padStart(10, "0");
    pdfContent += `${padded} 00000 n \n`;
  }

  pdfContent += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const encoder = new TextEncoder();
  return encoder.encode(pdfContent);
}

/**
 * Downloads a generated compliance PDF directly in the browser as a file.
 */
export function downloadCompliancePdfFile(options: PdfReportOptions): void {
  const bytes = generateCompliancePdf(options);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `training-compliance-${options.groupBy === "course" ? "courses" : "employees"}-${dateStr}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
