import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import logoUrl from '@/assets/logo.png';
import sonapLogoUrl from '@/assets/sonap.jpeg';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Rôles supportés (Synchronisé avec pdfExport.ts) ────────────────
export type AppRole =
  | 'super_admin' | 'admin_etat' | 'directeur_general' | 'directeur_adjoint'
  | 'directeur_aval' | 'directeur_adjoint_aval' | 'chef_division_distribution' | 'chef_bureau_aval'
  | 'agent_supervision_aval' | 'controleur_distribution' | 'technicien_support_dsa' | 'technicien_flux'
  | 'inspecteur' | 'analyste'
  | 'personnel_admin' | 'service_it' | 'responsable_entreprise'
  | 'technicien_aval' | 'operateur_entreprise'
  | 'directeur_juridique' | 'juriste' | 'charge_conformite' | 'assistant_juridique'
  | 'directeur_financier' | 'controleur_financier' | 'comptable'
  | 'directeur_importation' | 'agent_importation' | 'directeur_logistique' | 'agent_logistique';

const ROLE_SIGNATURE: Record<string, { gauche: string; droite: string }> = {
  directeur_general:  { gauche: '', droite: "SIGNATURE" },
  directeur_adjoint:  { gauche: '', droite: "SIGNATURE" },
  admin_etat:         { gauche: '', droite: "SIGNATURE" },
  directeur_aval:     { gauche: '', droite: "SIGNATURE" },
  directeur_adjoint_aval: { gauche: '', droite: "SIGNATURE" },
  inspecteur:         { gauche: '', droite: "SIGNATURE" },
  analyste:           { gauche: '', droite: "SIGNATURE" },
  personnel_admin:    { gauche: '', droite: "SIGNATURE" },
  service_it:         { gauche: '', droite: "SIGNATURE" },
  responsable_entreprise: { gauche: '', droite: "SIGNATURE" },

  super_admin:        { gauche: '', droite: "SIGNATURE" },
};

// Helper: Convert Image URL to Base64 (Buffer for ExcelJS)
const getLogoBuffer = async (url: string): Promise<ArrayBuffer | null> => {
    try {
        const response = await fetch(url);
        return await response.arrayBuffer();
    } catch (error) {
        console.error('Error fetching logo buffer:', error);
        return null;
    }
};

interface ExcelExportOptions {
    title: string;
    filename: string;
    headers: string[];
    data: any[][];
    signerRole?: string;
    sheetName?: string;
}

export async function generateExcelReport({
    title,
    filename,
    headers,
    data,
    signerRole,
    sheetName = 'Rapport SIHG'
}: ExcelExportOptions) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIHG SONAP - Système National';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: false }]
    });

    // 1. Column Auto-sizing based on data & headers
    const colWidths = headers.map(h => Math.max(h.length + 5, 15));
    data.forEach(row => {
        row.forEach((cell, i) => {
            const cellLen = cell ? String(cell).length + 2 : 10;
            if (cellLen > colWidths[i]) colWidths[i] = cellLen;
        });
    });

    sheet.columns = [
        { width: 3 }, // Margin A
        ...headers.map((h, i) => ({ width: Math.min(colWidths[i], 40) })),
        { width: 3 }  // Mid margin
    ];

    // 2. Official Header (Flag Stripes)
    // We simulate the flag with colored cells
    const lastColLetter = String.fromCharCode(66 + headers.length - 1); // Starts from B
    
    // Flag Colors
    const flagRange = `B1:${lastColLetter}1`;
    sheet.mergeCells(flagRange);
    const flagRow = sheet.getRow(1);
    
    // Official Layout Heights
    sheet.getRow(2).height = 65; // Logos space
    sheet.getRow(3).height = 25; // SIHG text
    sheet.getRow(4).height = 30; // Title

    // 3. LOGOS
    const nexusBuffer = await getLogoBuffer(logoUrl);
    const sonapBuffer = await getLogoBuffer(sonapLogoUrl);

    if (nexusBuffer) {
        const logoId = workbook.addImage({
            buffer: nexusBuffer,
            extension: 'png',
        });
        sheet.addImage(logoId, {
            tl: { col: 1, row: 1 }, 
            ext: { width: 80, height: 80 },
            editAs: 'oneCell'
        });
    }

    if (sonapBuffer) {
        const sonapId = workbook.addImage({
            buffer: sonapBuffer,
            extension: 'jpeg',
        });
        // Sonap on the right
        sheet.addImage(sonapId, {
            tl: { col: headers.length, row: 1 },
            ext: { width: 80, height: 80 },
            editAs: 'oneCell'
        });
    }

    // 4. Institutional Text
    const centerCol = Math.floor(headers.length / 2) + 1;
    sheet.mergeCells(`C2:${lastColLetter}2`);
    const headerTextCell = sheet.getCell('C2');
    headerTextCell.value = "REPUBLIQUE DE GUINEE\nPRESIDENCE DE LA REPUBLIQUE\nSOCIETE NATIONALE DES PETROLES (SONAP)";
    headerTextCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerTextCell.font = { name: 'Arial', size: 10, bold: true };

    sheet.mergeCells(`C3:${lastColLetter}3`);
    const subTitleCell = sheet.getCell('C3');
    subTitleCell.value = "Système Intégré de Gestion des Hydrocarbures (SIHG)";
    subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subTitleCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF00944D' } };

    // 5. Report Title
    sheet.mergeCells(`B4:${lastColLetter}4`);
    const titleCell = sheet.getCell('B4');
    titleCell.value = title.toUpperCase();
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFCE1126' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };

    const dateCell = sheet.getCell('B5');
    sheet.mergeCells(`B5:${lastColLetter}5`);
    dateCell.value = `Généré le: ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`;
    dateCell.alignment = { horizontal: 'center' };
    dateCell.font = { name: 'Arial', size: 9, italic: true };

    // 6. Data Headers
    const headerRowNum = 7;
    const headerRow = sheet.getRow(headerRowNum);
    headerRow.height = 25;
    
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 2);
        cell.value = h;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00944D' } };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin'}, right: { style: 'thin'}
        };
    });

    // 7. Insert Data
    data.forEach((rowData, rowIndex) => {
        const row = sheet.getRow(headerRowNum + 1 + rowIndex);
        row.height = 20;
        rowData.forEach((val, colIndex) => {
            const cell = row.getCell(colIndex + 2);
            cell.value = val;
            cell.alignment = { vertical: 'middle' };
            cell.font = { name: 'Arial', size: 10 };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin'}, right: { style: 'thin'}
            };
            
            // Auto formats
            if (typeof val === 'number') {
                cell.numFmt = '#,##0.00';
            }
        });
    });

    // 8. Signatures & QR Code at the bottom
    const bottomRowNum = headerRowNum + data.length + 3;
    
    // QR CODE
    try {
        const qrData = JSON.stringify({
            doc: title,
            ref: Math.random().toString(36).substring(7).toUpperCase(),
            date: new Date().toISOString()
        });
        const qrB64 = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
        const qrBuffer = await (await fetch(qrB64)).arrayBuffer();
        
        const qrId = workbook.addImage({
            buffer: qrBuffer,
            extension: 'png',
        });
        sheet.addImage(qrId, {
            tl: { col: 1, row: bottomRowNum },
            ext: { width: 70, height: 70 }
        });
    } catch (e) { console.error('QR Error:', e); }

    const sig = ROLE_SIGNATURE[signerRole || 'directeur_general'] || ROLE_SIGNATURE['directeur_general'];
    
    const sigLineRow = bottomRowNum + 5;
    
    // Uniquement la signature a droite
    if (sig.droite) {
        sheet.getCell(sigLineRow, headers.length).value = sig.droite;
        sheet.getCell(sigLineRow, headers.length).font = { bold: true, size: 10 };
        sheet.getCell(sigLineRow, headers.length).alignment = { horizontal: 'right' };
        
        // Simuler une ligne de signature
        const borderRow = sigLineRow + 2;
        sheet.getCell(borderRow, headers.length).border = { bottom: { style: 'medium' } };
    }

    // Final Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
