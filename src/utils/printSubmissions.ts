import JsPDF from 'jspdf';

import { type UserGroup } from './sortUserGroups';

// Utility to convert image URL to Base64
const getImageAsBase64 = (url: string): Promise<string> => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')?.drawImage(img, 0, 0);
    resolve(canvas.toDataURL('image/jpeg'));
  };
  img.onerror = () => reject(new Error(`Could not load image: ${url}`));
  img.src = url;
});

export const handlePrintSubmissions = async (groupedImages: UserGroup[]) => {
  const doc = new JsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const lineHeight = 8;
  let currentY = margin;

  // Split users by those with and without images
  const usersWithImages = groupedImages.filter((group) => group.images.length > 0);
  const usersWithoutImages = groupedImages.filter((group) => group.images.length === 0);

  // Sort users with images: by name, then image count
  const sortedGroupedImages = [...usersWithImages, ...usersWithoutImages]
    .map((group) => ({
      ...group,
      images: group.images.sort((a, b) => new Date(a.createdAt).getTime()
      - new Date(b.createdAt).getTime()),
    }))
    .sort((a, b) => {
      // Users with images first
      const aHasImages = a.images.length > 0;
      const bHasImages = b.images.length > 0;
      if (aHasImages && !bHasImages) return -1;
      if (!aHasImages && bHasImages) return 1;

      // Sort by name
      const nameCompare = a.user.userName.localeCompare(b.user.userName);
      if (nameCompare !== 0) return nameCompare;

      // Then by image count
      return a.images.length - b.images.length;
    });

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < sortedGroupedImages.length; i++) {
    const group = sortedGroupedImages[i];
    const { userName } = group.user;
    const imageCount = group.images.length;

    if (i !== 0) doc.addPage();
    currentY = margin;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${userName} - ${imageCount} ${imageCount === 1 ? 'image' : 'images'}`, margin, currentY);
    currentY += lineHeight;

    // eslint-disable-next-line no-restricted-syntax
    for (const file of group.images) {
      const { imageUrl, isCorrect, feedback } = file.payloadJson;

      try {
        // eslint-disable-next-line no-await-in-loop
        const imageData = await getImageAsBase64(imageUrl);

        const imgProps = doc.getImageProperties(imageData);
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxImageHeight = pageHeight * 0.8;
        const imgWidthAvailable = pageWidth - 2 * margin;

        const widthScale = imgWidthAvailable / imgProps.width;
        const heightScale = maxImageHeight / imgProps.height;
        const scale = Math.min(widthScale, heightScale);

        const imgWidth = imgProps.width * scale;
        const imgHeight = imgProps.height * scale;

        // Prepare feedback and correctness texts
        // eslint-disable-next-line no-nested-ternary
        const correctnessText = isCorrect === true
          ? 'Correct'
          : isCorrect === false
            ? 'Incorrect'
            : null;

        const feedbackLines = feedback
          ? doc.splitTextToSize(feedback, pageWidth - 2 * margin)
          : [];

        const feedbackHeight = feedbackLines.length * lineHeight;
        const labelHeight = correctnessText ? lineHeight + 3 : 0;
        const totalBlockHeight = imgHeight + labelHeight + feedbackHeight + 10;

        // Ensure content fits on page
        if (currentY + totalBlockHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }

        // Draw image centered
        const xCenter = (pageWidth - imgWidth) / 2;
        doc.addImage(imageData, 'JPEG', xCenter, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5;

        // Draw correctness label
        if (correctnessText) {
          doc.setFontSize(12);
          doc.setTextColor(isCorrect ? 0 : 200, isCorrect ? 128 : 0, 0);
          const textWidth = doc.getTextWidth(correctnessText);
          const textX = (pageWidth - textWidth) / 2;
          doc.text(correctnessText, textX, currentY);
          currentY += labelHeight;
        }

        // Draw feedback
        if (feedback) {
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          const feedbackX = pageWidth / 2;
          doc.text(feedbackLines, feedbackX, currentY, {
            align: 'center',
            maxWidth: pageWidth - 2 * margin,
          });
          currentY += feedbackHeight + 5;
        } else {
          currentY += 10;
        }

        doc.setTextColor(0, 0, 0);
      } catch (error) {
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.text(`Failed to load image: ${imageUrl}`, margin, currentY);
        currentY += lineHeight;
        doc.setTextColor(0, 0, 0);
      }
    }
  }

  // Add date to filename
  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}-${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}m${String(now.getSeconds()).padStart(2, '0')}s`;
  doc.save(`submissions-${formattedDate}.pdf`);
};
