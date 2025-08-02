import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Setlist, Music, LyricLine } from '../types';

export interface PDFExportOptions {
  includeChords: boolean;
  fontSize: number;
  pageMargin: number;
  showPageNumbers: boolean;
  headerText?: string;
  footerText?: string;
}

const defaultOptions: PDFExportOptions = {
  includeChords: true,
  fontSize: 12,
  pageMargin: 20,
  showPageNumbers: true,
  headerText: '',
  footerText: '',
};

export async function exportSetlistToPDF(
  setlist: Setlist,
  options: Partial<PDFExportOptions> = {}
): Promise<void> {
  const opts = { ...defaultOptions, ...options };
  
  try {
    // Criar documento PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (opts.pageMargin * 2);
    
    let currentY = opts.pageMargin;
    let pageNumber = 1;
    
    // Função para adicionar nova página
    const addNewPage = () => {
      pdf.addPage();
      pageNumber++;
      currentY = opts.pageMargin;
      
      // Adicionar header se especificado
      if (opts.headerText) {
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text(opts.headerText, opts.pageMargin, 15);
      }
    };
    
    // Função para verificar se precisa de nova página
    const checkPageBreak = (requiredHeight: number) => {
      if (currentY + requiredHeight > pageHeight - opts.pageMargin - 20) {
        addNewPage();
      }
    };
    
    // Adicionar header inicial se especificado
    if (opts.headerText) {
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(opts.headerText, opts.pageMargin, 15);
      currentY = 25;
    }
    
    // Título do setlist
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(setlist.name, opts.pageMargin, currentY);
    currentY += 10;
    
    // Descrição do setlist
    if (setlist.description) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(64, 64, 64);
      const lines = pdf.splitTextToSize(setlist.description, contentWidth);
      pdf.text(lines, opts.pageMargin, currentY);
      currentY += lines.length * 5 + 5;
    }
    
    // Informações do setlist
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    const info = [
      `Data: ${new Date(setlist.createdAt).toLocaleDateString('pt-BR')}`,
      `Músicas: ${setlist.musics.length}`,
      `Duração estimada: ~${Math.ceil(setlist.musics.length * 3.5)} minutos`
    ];
    pdf.text(info.join(' | '), opts.pageMargin, currentY);
    currentY += 15;
    
    // Adicionar linha separadora
    pdf.setDrawColor(200, 200, 200);
    pdf.line(opts.pageMargin, currentY, pageWidth - opts.pageMargin, currentY);
    currentY += 10;
    
    // Iterar através das músicas
    for (let i = 0; i < setlist.musics.length; i++) {
      const music = setlist.musics[i];
      
      // Verificar se precisa de nova página para a música
      checkPageBreak(40);
      
      // Número e título da música
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const musicTitle = `${i + 1}. ${music.title}`;
      pdf.text(musicTitle, opts.pageMargin, currentY);
      currentY += 8;
      
      // Artista e tom
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(64, 64, 64);
      const musicInfo = `${music.artist} - Tom: ${music.currentKey}`;
      pdf.text(musicInfo, opts.pageMargin, currentY);
      currentY += 10;
      
      // Letras e cifras
      if (music.lyrics.length > 0) {
        await addMusicContentToPDF(pdf, music, opts, currentY, contentWidth, pageWidth, pageHeight);
        currentY = pdf.internal.pageSize.getHeight() - opts.pageMargin; // Forçar nova página para próxima música
      }
      
      // Espaço entre músicas
      currentY += 15;
      
      // Adicionar nova página se não for a última música
      if (i < setlist.musics.length - 1) {
        addNewPage();
      }
    }
    
    // Adicionar números de página se especificado
    if (opts.showPageNumbers) {
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - opts.pageMargin - 20,
          pageHeight - 10
        );
        
        // Adicionar footer se especificado
        if (opts.footerText) {
          pdf.text(opts.footerText, opts.pageMargin, pageHeight - 10);
        }
      }
    }
    
    // Download do PDF
    const fileName = `${setlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw new Error('Falha ao gerar PDF. Tente novamente.');
  }
}

async function addMusicContentToPDF(
  pdf: jsPDF,
  music: Music,
  options: PDFExportOptions,
  startY: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number
): Promise<void> {
  let currentY = startY;
  const lineHeight = 6;
  const chordHeight = 4;
  
  // Configurar fonte para cifras e letras
  pdf.setFont('courier', 'normal'); // Fonte monoespaçada para alinhamento
  
  for (const line of music.lyrics) {
    // Verificar se precisa de nova página
    const requiredHeight = options.includeChords && line.chords.length > 0 ? chordHeight + lineHeight + 2 : lineHeight + 2;
    if (currentY + requiredHeight > pageHeight - options.pageMargin - 20) {
      pdf.addPage();
      currentY = options.pageMargin;
    }
    
    // Adicionar cifras se incluídas e existirem
    if (options.includeChords && line.chords.length > 0) {
      pdf.setFontSize(options.fontSize - 2);
      pdf.setTextColor(0, 100, 200); // Azul para cifras
      
      // Criar linha de cifras
      const chordLine = ' '.repeat(line.text.length);
      const chordArray = chordLine.split('');
      
      line.chords.forEach(chord => {
        const pos = Math.min(chord.position, chordArray.length - chord.chord.length);
        for (let i = 0; i < chord.chord.length; i++) {
          if (pos + i < chordArray.length) {
            chordArray[pos + i] = chord.chord[i];
          }
        }
      });
      
      pdf.text(chordArray.join(''), options.pageMargin, currentY);
      currentY += chordHeight;
    }
    
    // Adicionar letra
    pdf.setFontSize(options.fontSize);
    pdf.setTextColor(0, 0, 0);
    
    if (line.text.trim()) {
      // Quebrar texto se muito longo
      const lines = pdf.splitTextToSize(line.text, contentWidth);
      pdf.text(lines, options.pageMargin, currentY);
      currentY += lines.length * lineHeight;
    } else {
      // Linha vazia (espaço)
      currentY += lineHeight / 2;
    }
    
    currentY += 2; // Espaço extra entre linhas
  }
}

// Função alternativa para exportar via captura de tela (caso queira preservar styling exato)
export async function exportSetlistToImagePDF(
  setlistElementId: string,
  filename: string
): Promise<void> {
  try {
    const element = document.getElementById(setlistElementId);
    if (!element) {
      throw new Error('Elemento do setlist não encontrado');
    }
    
    // Capturar elemento como imagem
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
  } catch (error) {
    console.error('Erro ao exportar imagem para PDF:', error);
    throw new Error('Falha ao gerar PDF da imagem. Tente novamente.');
  }
}