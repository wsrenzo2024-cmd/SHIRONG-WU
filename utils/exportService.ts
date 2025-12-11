import { SceneData, GenerationSettings } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import FileSaver from 'file-saver';

export const exportToTxt = (scenes: SceneData[], settings: GenerationSettings | null) => {
  let content = `Script2Prompt Export\n`;
  content += `Generated: ${new Date().toLocaleString()}\n`;
  if (settings) {
    content += `Style: ${settings.artStyle} | Ratio: ${settings.aspectRatio}\n`;
  }
  content += `=================================================\n\n`;

  scenes.forEach((scene, index) => {
    content += `SCENE ${index + 1}: ${scene.originalScript}\n`;
    content += `Images Qty: ${scene.imageCount}\n\n`;
    content += `[Reasoning - EN]\n${scene.reasoningEn}\n`;
    content += `[Reasoning - ZH]\n${scene.reasoningZh}\n\n`;
    
    // Loop through prompts based on imageCount
    const count = scene.imageCount;
    for (let i = 0; i < count; i++) {
        const prompt = scene.prompts[i] || scene.prompts[scene.prompts.length - 1] || scene.prompts[0];
        content += `--- Image #${i+1} ---\n`;
        content += `[T2I Prompt - EN]\n${prompt.t2iEn}\n`;
        content += `[T2I Prompt - ZH]\n${prompt.t2iZh}\n`;
        content += `[I2V Prompt - EN]\n${prompt.i2vEn}\n`;
        content += `[I2V Prompt - ZH]\n${prompt.i2vZh}\n\n`;
    }
    content += `-------------------------------------------------\n\n`;
  });

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  FileSaver.saveAs(blob, "script2prompt_export.txt");
};

export const exportToDocx = async (scenes: SceneData[], settings: GenerationSettings | null) => {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: "Script2Prompt Vision Plan",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  );

  if (settings) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Art Style: ", bold: true }),
          new TextRun(settings.artStyle + "    "),
          new TextRun({ text: "Aspect Ratio: ", bold: true }),
          new TextRun(settings.aspectRatio),
        ],
        spacing: { after: 300 }
      })
    );
  }

  scenes.forEach((scene, index) => {
    // Scene Header
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Scene ${index + 1}: `, bold: true, size: 28, color: "4F46E5" }),
          new TextRun({ text: scene.originalScript, italics: true, size: 24 })
        ],
        spacing: { before: 400, after: 200 },
        heading: HeadingLevel.HEADING_2
      })
    );

    // Metadata
    children.push(
        new Paragraph({
            children: [
                new TextRun({ text: `Images: ${scene.imageCount}`, bold: true }),
            ],
            spacing: { after: 100 }
        })
    );

    // Reasoning
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Visual Reasoning (EN):", bold: true }),
          new TextRun({ text: "\n" + scene.reasoningEn })
        ],
        spacing: { after: 200 }
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Visual Reasoning (ZH):", bold: true }),
          new TextRun({ text: "\n" + scene.reasoningZh })
        ],
        spacing: { after: 200 }
      })
    );

    // Loop through Prompts
    const count = scene.imageCount;
    for (let i = 0; i < count; i++) {
        const prompt = scene.prompts[i] || scene.prompts[scene.prompts.length - 1] || scene.prompts[0];
        
        children.push(new Paragraph({
             text: `Image #${i+1}`,
             heading: HeadingLevel.HEADING_4,
             spacing: { before: 200, after: 100 }
        }));

        const createPromptSection = (title: string, en: string, zh: string) => [
            new Paragraph({
                text: title,
                heading: HeadingLevel.HEADING_5, // smaller heading
                spacing: { after: 50 }
            }),
            new Paragraph({
                children: [new TextRun({ text: "EN: ", bold: true }), new TextRun(en)],
                spacing: { after: 50 }
            }),
            new Paragraph({
                children: [new TextRun({ text: "ZH: ", bold: true }), new TextRun(zh)],
                spacing: { after: 100 }
            })
        ];

        children.push(...createPromptSection("Text-to-Image", prompt.t2iEn, prompt.t2iZh));
        children.push(...createPromptSection("Image-to-Video", prompt.i2vEn, prompt.i2vZh));
    }
    
    // Divider
    children.push(new Paragraph({ text: "", border: { bottom: { color: "CCCCCC", space: 1, style: BorderStyle.SINGLE, size: 6 } } }));
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  FileSaver.saveAs(blob, "script2prompt_vision_plan.docx");
};

export const exportToPdf = (scenes: SceneData[], settings: GenerationSettings | null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Script2Prompt Export</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
            h1 { text-align: center; color: #4338ca; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
            .meta { text-align: center; color: #6b7280; margin-bottom: 40px; font-size: 0.9em; }
            .scene { break-inside: avoid; margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
            .scene-header { background: #f3f4f6; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; font-weight: bold; font-size: 1.1em; display: flex; justify-content: space-between; }
            .scene-body { padding: 20px; }
            .reasoning-container { display: flex; gap: 20px; margin-bottom: 20px; }
            .reasoning { flex: 1; background: #eff6ff; padding: 15px; border-radius: 6px; font-size: 0.9em; color: #1e3a8a; }
            .reasoning.zh { background: #ecfdf5; color: #064e3b; }
            .prompt-block { margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px; }
            .prompt-block:first-of-type { border-top: none; padding-top: 0; }
            .img-label { font-size: 0.8em; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 10px; }
            .prompt-section { margin-bottom: 15px; }
            .label { font-size: 0.75em; font-weight: bold; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 4px; }
            .prompt-box { background: #f9fafb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.85em; margin-bottom: 8px; border: 1px solid #e5e7eb; }
            .zh { color: #4b5563; }
            @media print {
              body { padding: 0; }
              .scene { border: none; border-bottom: 1px solid #ccc; border-radius: 0; margin-bottom: 20px; padding-bottom: 20px; }
              .scene-header { background: none; padding-left: 0; font-size: 1.2em; border-bottom: none; }
              .reasoning { background: none; border: 1px solid #ddd; }
            }
          </style>
        </head>
        <body>
          <h1>Script2Prompt Vision Plan</h1>
          ${settings ? `<div class="meta">Style: ${settings.artStyle} &bull; Ratio: ${settings.aspectRatio}</div>` : ''}
          
          ${scenes.map((scene, i) => `
            <div class="scene">
              <div class="scene-header">
                <span>Scene ${i+1}: "${scene.originalScript}"</span>
                <span style="font-size: 0.8em; opacity: 0.7;">Qty: ${scene.imageCount}</span>
              </div>
              <div class="scene-body">
                <div class="reasoning-container">
                    <div class="reasoning"><strong>Analysis (EN):</strong><br/>${scene.reasoningEn}</div>
                    <div class="reasoning zh"><strong>Analysis (ZH):</strong><br/>${scene.reasoningZh}</div>
                </div>
                
                ${Array.from({length: scene.imageCount}).map((_, idx) => {
                   const prompt = scene.prompts[idx] || scene.prompts[scene.prompts.length - 1] || scene.prompts[0];
                   return `
                    <div class="prompt-block">
                        <div class="img-label">Image #${idx+1}</div>
                        <div class="prompt-section">
                          <div class="label">T2I Prompt (EN)</div>
                          <div class="prompt-box">${prompt.t2iEn}</div>
                          <div class="label">T2I Prompt (ZH)</div>
                          <div class="prompt-box zh">${prompt.t2iZh}</div>
                        </div>

                        <div class="prompt-section">
                          <div class="label">I2V Prompt (EN)</div>
                          <div class="prompt-box">${prompt.i2vEn}</div>
                          <div class="label">I2V Prompt (ZH)</div>
                          <div class="prompt-box zh">${prompt.i2vZh}</div>
                        </div>
                    </div>
                   `;
                }).join('')}
              </div>
            </div>
          `).join('')}
          <script>
            window.onload = () => { setTimeout(() => window.print(), 500); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};