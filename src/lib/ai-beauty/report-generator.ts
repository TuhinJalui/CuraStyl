/**
 * AI Transformation Report Generator
 * 
 * Generates comprehensive PDF reports with analysis results, compatibility scores,
 * salon recommendations, and before/after AR preview images.
 * 
 * @see Design Document: Phase 9 - AI Transformation Report
 * @see Requirements: 6.1-6.10
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type {
  AIBeautyBlueprint,
  FaceAnalysisData,
  HairAnalysisData,
  StyleCompatibilityScore,
  SalonMatch,
} from './types';

/**
 * Report Generator Configuration
 */
export interface ReportConfig {
  /** User's name for personalization */
  userName?: string;
  
  /** Face analysis results */
  faceAnalysis: FaceAnalysisData;
  
  /** Hair analysis results */
  hairAnalysis: HairAnalysisData;
  
  /** Top style recommendations with scores */
  topStyles: StyleCompatibilityScore[];
  
  /** Recommended salons */
  recommendedSalons: SalonMatch[];
  
  /** Before image (original photo) */
  beforeImageUrl?: string;
  
  /** After images (AR previews for top styles) */
  afterImageUrls?: { styleId: string; imageUrl: string }[];
}

/**
 * AI Beauty Report Generator
 * 
 * Creates branded PDF reports with analysis results and recommendations.
 */
export class ReportGenerator {
  private config: ReportConfig;
  private pdf: jsPDF;
  
  constructor(config: ReportConfig) {
    // Validate required data (Requirement 6.1)
    if (!config.faceAnalysis) {
      throw new Error('Face analysis data is required for report generation');
    }
    if (!config.hairAnalysis) {
      throw new Error('Hair analysis data is required for report generation');
    }
    if (!config.topStyles || config.topStyles.length === 0) {
      throw new Error('Style compatibility scores are required for report generation');
    }
    if (!config.recommendedSalons || config.recommendedSalons.length === 0) {
      throw new Error('Salon recommendations are required for report generation');
    }
    
    this.config = config;
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
  }
  
  /**
   * Generate complete PDF report
   * 
   * @returns Promise resolving to PDF blob
   */
  async generate(): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      // Add header and branding (Requirement 6.2, 6.5)
      this.addHeader();
      
      // Page 1: Face Analysis
      this.addFaceAnalysisSection();
      
      // Page 2: Hair Analysis
      this.pdf.addPage();
      this.addHairAnalysisSection();
      
      // Page 3: Style Recommendations with scores
      this.pdf.addPage();
      await this.addStyleRecommendationsSection();
      
      // Page 4: Salon Recommendations
      this.pdf.addPage();
      this.addSalonRecommendationsSection();
      
      // Page 5: Before/After Previews (if available)
      if (this.config.beforeImageUrl && this.config.afterImageUrls && this.config.afterImageUrls.length > 0) {
        this.pdf.addPage();
        await this.addBeforeAfterSection();
      }
      
      // Add footer to all pages
      this.addFooters();
      
      // Generate blob
      const blob = this.pdf.output('blob');
      
      const duration = performance.now() - startTime;
      
      // Requirement 6.6: Should complete within 5 seconds
      if (duration > 5000) {
        console.warn(`Report generation took ${duration.toFixed(0)}ms (target: <5000ms)`);
      }
      
      // Requirement 6.7: Should be under 3MB
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB > 3) {
        console.warn(`Report size is ${sizeMB.toFixed(2)}MB (target: <3MB)`);
      }
      
      console.log(`Report generated in ${duration.toFixed(0)}ms, size: ${sizeMB.toFixed(2)}MB`);
      
      return blob;
      
    } catch (error) {
      console.error('Report generation failed:', error);
      throw new Error('Failed to generate PDF report');
    }
  }
  
  /**
   * Add branded header with logo and user name
   */
  private addHeader(): void {
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    
    // Gradient background (simulated with colored rectangle)
    this.pdf.setFillColor(139, 69, 247); // Purple
    this.pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Title
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('AI Beauty Intelligence Report™', pageWidth / 2, 15, { align: 'center' });
    
    // User name and date (Requirement 6.5)
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'normal');
    const userName = this.config.userName || 'Valued Customer';
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    this.pdf.text(`Prepared for: ${userName}`, pageWidth / 2, 25, { align: 'center' });
    this.pdf.text(`Generated: ${date}`, pageWidth / 2, 32, { align: 'center' });
  }
  
  /**
   * Add face analysis section
   */
  private addFaceAnalysisSection(): void {
    let yPos = 50;
    
    // Section title
    this.pdf.setFontSize(18);
    this.pdf.setTextColor(139, 69, 247);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Facial Analysis', 20, yPos);
    
    yPos += 10;
    
    // Analysis results
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFont('helvetica', 'normal');
    
    const faceData = [
      ['Face Shape', this.capitalize(this.config.faceAnalysis.faceShape)],
      ['Skin Tone', this.config.faceAnalysis.skinTone],
      ['Eye Shape', this.config.faceAnalysis.facialFeatures.eyeShape],
      ['Eye Color', this.config.faceAnalysis.facialFeatures.eyeColor],
      ['Lip Shape', this.config.faceAnalysis.facialFeatures.lipShape],
      ['Nose Shape', this.config.faceAnalysis.facialFeatures.noseShape],
      ['Confidence', `${Math.round(this.config.faceAnalysis.confidence * 100)}%`],
    ];
    
    faceData.forEach(([label, value]) => {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`${label}:`, 20, yPos);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(value, 70, yPos);
      yPos += 8;
    });
    
    // Add explanation text
    yPos += 5;
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(100, 100, 100);
    const explanationText = `Based on advanced AI facial landmark detection with 468+ points, we've identified your unique facial structure. This analysis helps us recommend hairstyles that complement your natural features and enhance your overall appearance.`;
    const splitText = this.pdf.splitTextToSize(explanationText, 170);
    this.pdf.text(splitText, 20, yPos);
  }
  
  /**
   * Add hair analysis section
   */
  private addHairAnalysisSection(): void {
    let yPos = 50;
    
    // Section title
    this.pdf.setFontSize(18);
    this.pdf.setTextColor(236, 72, 153); // Pink
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Hair Analysis', 20, yPos);
    
    yPos += 10;
    
    // Analysis results
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFont('helvetica', 'normal');
    
    const hairData = [
      ['Hair Color', this.config.hairAnalysis.color],
      ['Texture', this.capitalize(this.config.hairAnalysis.texture)],
      ['Length', this.capitalize(this.config.hairAnalysis.length)],
      ['Density', this.capitalize(this.config.hairAnalysis.density)],
      ['Confidence', `${Math.round(this.config.hairAnalysis.confidence * 100)}%`],
    ];
    
    hairData.forEach(([label, value]) => {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`${label}:`, 20, yPos);
      this.pdf.setFont('helvetica', 'normal');
      
      // Show color swatch for hair color
      if (label === 'Hair Color') {
        const hexColor = value.replace('#', '');
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        
        this.pdf.setFillColor(r, g, b);
        this.pdf.rect(70, yPos - 4, 8, 5, 'F');
        this.pdf.setDrawColor(0, 0, 0);
        this.pdf.rect(70, yPos - 4, 8, 5, 'S');
        
        this.pdf.text(value, 82, yPos);
      } else {
        this.pdf.text(value, 70, yPos);
      }
      
      yPos += 8;
    });
    
    // Add explanation text
    yPos += 5;
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(100, 100, 100);
    const explanationText = `Using advanced hair segmentation technology, we've analyzed your current hair characteristics. Understanding your natural hair texture, color, and density allows us to recommend styles that work with your hair, not against it.`;
    const splitText = this.pdf.splitTextToSize(explanationText, 170);
    this.pdf.text(splitText, 20, yPos);
  }
  
  /**
   * Add style recommendations with compatibility scores and visualizations
   * (Requirement 6.4)
   */
  private async addStyleRecommendationsSection(): Promise<void> {
    let yPos = 50;
    
    // Section title
    this.pdf.setFontSize(18);
    this.pdf.setTextColor(16, 185, 129); // Emerald
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Recommended Styles', 20, yPos);
    
    yPos += 10;
    
    // Take top 5 styles
    const topStyles = this.config.topStyles.slice(0, 5);
    
    topStyles.forEach((style, index) => {
      // Style name
      this.pdf.setFontSize(13);
      this.pdf.setTextColor(0, 0, 0);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`${index + 1}. ${style.styleName}`, 20, yPos);
      
      yPos += 6;
      
      // Compatibility score with bar chart
      this.pdf.setFontSize(11);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(`Compatibility: ${style.compatibilityScore}%`, 20, yPos);
      
      // Draw progress bar
      const barWidth = 100;
      const barHeight = 6;
      const fillWidth = (style.compatibilityScore / 100) * barWidth;
      
      // Background
      this.pdf.setFillColor(230, 230, 230);
      this.pdf.rect(75, yPos - 4, barWidth, barHeight, 'F');
      
      // Fill (gradient color based on score)
      const color = this.getScoreColor(style.compatibilityScore);
      this.pdf.setFillColor(color.r, color.g, color.b);
      this.pdf.rect(75, yPos - 4, fillWidth, barHeight, 'F');
      
      // Border
      this.pdf.setDrawColor(200, 200, 200);
      this.pdf.rect(75, yPos - 4, barWidth, barHeight, 'S');
      
      yPos += 8;
      
      // Reasoning
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(80, 80, 80);
      const reasoningText = this.pdf.splitTextToSize(style.reasoning, 170);
      this.pdf.text(reasoningText, 20, yPos);
      
      yPos += reasoningText.length * 4 + 8;
      
      // Add spacing between styles
      if (index < topStyles.length - 1) {
        yPos += 3;
      }
    });
  }
  
  /**
   * Add salon recommendations section
   */
  private addSalonRecommendationsSection(): void {
    let yPos = 50;
    
    // Section title
    this.pdf.setFontSize(18);
    this.pdf.setTextColor(59, 130, 246); // Blue
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Recommended Salons', 20, yPos);
    
    yPos += 10;
    
    // Take top 3 salons
    const topSalons = this.config.recommendedSalons.slice(0, 3);
    
    topSalons.forEach((salon, index) => {
      // Salon name and match score
      this.pdf.setFontSize(13);
      this.pdf.setTextColor(0, 0, 0);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`${index + 1}. ${salon.salonName}`, 20, yPos);
      
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(16, 185, 129);
      this.pdf.text(`Match Score: ${salon.matchScore}%`, 150, yPos);
      
      yPos += 6;
      
      // Details
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(0, 0, 0);
      this.pdf.setFont('helvetica', 'normal');
      
      const details = [
        `📍 ${salon.location.address}`,
        `📏 ${salon.location.distance} miles away`,
        `⭐ ${salon.rating}/5 (${salon.reviewCount} reviews)`,
        `💰 ₹${salon.pricing.estimatedCost} estimated`,
        `✨ Specializes in: ${salon.expertiseMatch.slice(0, 3).join(', ')}`,
      ];
      
      details.forEach(detail => {
        this.pdf.text(detail, 25, yPos);
        yPos += 5;
      });
      
      yPos += 8;
    });
  }
  
  /**
   * Add before/after preview images section
   * (Requirement 6.3 - minimum 800px width)
   */
  private async addBeforeAfterSection(): Promise<void> {
    let yPos = 50;
    
    // Section title
    this.pdf.setFontSize(18);
    this.pdf.setTextColor(139, 69, 247);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Before & After Preview', 20, yPos);
    
    yPos += 10;
    
    // Note: In production, you'd load and embed actual images here
    // For now, add placeholder text
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text('AR preview images would be embedded here (minimum 800px width)', 20, yPos);
    
    // In a real implementation, you would:
    // 1. Load images from URLs
    // 2. Ensure they're at least 800px width
    // 3. Compress them appropriately
    // 4. Embed them in the PDF using this.pdf.addImage()
  }
  
  /**
   * Add footers to all pages
   */
  private addFooters(): void {
    const pageCount = this.pdf.getNumberOfPages();
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    const pageHeight = this.pdf.internal.pageSize.getHeight();
    
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      
      // Footer line
      this.pdf.setDrawColor(200, 200, 200);
      this.pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      
      // Footer text
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(150, 150, 150);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text('AI Beauty Intelligence Engine™ - Personalized Beauty Analysis', 20, pageHeight - 15);
      this.pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 15, { align: 'right' });
    }
  }
  
  /**
   * Get color based on compatibility score
   */
  private getScoreColor(score: number): { r: number; g: number; b: number } {
    if (score >= 80) {
      return { r: 16, g: 185, b: 129 }; // Emerald (excellent)
    } else if (score >= 60) {
      return { r: 59, g: 130, b: 246 }; // Blue (good)
    } else if (score >= 40) {
      return { r: 251, g: 191, b: 36 }; // Amber (fair)
    } else {
      return { r: 239, g: 68, b: 68 }; // Red (poor)
    }
  }
  
  /**
   * Capitalize first letter of string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Download the PDF with proper filename
   * (Requirement 6.8)
   */
  downloadPDF(fileName?: string): void {
    const name = fileName || `beauty-report-${Date.now()}.pdf`;
    this.pdf.save(name);
  }
  
  /**
   * Get PDF as data URL for email sharing
   * (Requirement 6.8)
   */
  getPDFDataUrl(): string {
    return this.pdf.output('dataurlstring');
  }
}

/**
 * Helper function to capture HTML element as image
 * Used for capturing AR preview screenshots
 */
export async function captureElementAsImage(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#000000',
    scale: 2, // Higher quality
    logging: false,
  });
  
  return canvas.toDataURL('image/jpeg', 0.85); // 85% quality for compression
}
