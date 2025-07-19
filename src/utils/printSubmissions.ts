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

  // eslint-disable-next-line no-restricted-syntax
  for (const group of sortedGroupedImages) {
    const userName = group.user.userName;

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < group.images.length; i++) {
      const file = group.images[i];
      const { imageUrl, isCorrect, feedback } = file.payloadJson;
      const isFirstImage = i === 0 && sortedGroupedImages.indexOf(group) === 0;
      if (!isFirstImage) {
        doc.addPage();
      }

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const lineHeight = 8;

      // ✅ Set title: "User Name - Image N"
      const imageNumber = i + 1;
      const title = `${userName} - Image ${imageNumber}`;

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      const titleWidth = doc.getTextWidth(title);
      const titleX = (pageWidth - titleWidth) / 2;
      doc.text(title, titleX, margin + lineHeight);

      let currentY = margin + lineHeight * 2;

      try {
        const imageData = await getImageAsBase64(imageUrl);
        const imgProps = doc.getImageProperties(imageData);
        const maxImageHeight = pageHeight * 0.8;
        const availableWidth = pageWidth - 2 * margin;

        const widthScale = availableWidth / imgProps.width;
        const heightScale = maxImageHeight / imgProps.height;
        const scale = Math.min(widthScale, heightScale);

        const imgWidth = imgProps.width * scale;
        const imgHeight = imgProps.height * scale;

        const xCenter = (pageWidth - imgWidth) / 2;
        doc.addImage(imageData, 'JPEG', xCenter, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5;

        // jsPDF doesn't support emojis https://github.com/parallax/jsPDF/issues/2072
        // eslint-disable-next-line no-nested-ternary
        const correctnessText = isCorrect === true
          ? 'Correct'
          : isCorrect === false
            ? 'Incorrect'
            : null;

        if (correctnessText) {
          doc.setFontSize(12);
          doc.setTextColor(isCorrect ? 0 : 200, isCorrect ? 128 : 0, 0);
          const textWidth = doc.getTextWidth(correctnessText);
          const textX = (pageWidth - textWidth) / 2;
          doc.text(correctnessText, textX, currentY);
          currentY += lineHeight + 3;
        }

        // Feedback (centered)
        if (feedback) {
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          const feedbackLines = doc.splitTextToSize(feedback, pageWidth - 2 * margin);
          doc.text(feedbackLines, pageWidth / 2, currentY, {
            align: 'center',
            maxWidth: pageWidth - 2 * margin,
          });
          currentY += feedbackLines.length * lineHeight + 5;
        }

        doc.setTextColor(0, 0, 0);
      } catch (error) {
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.text(`Failed to load image: ${imageUrl}`, margin, currentY);
        doc.setTextColor(0, 0, 0);
      }
    }
  }

  // Add date to filename
  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}-${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}m${String(now.getSeconds()).padStart(2, '0')}s`;
  doc.save(`submissions-${formattedDate}.pdf`);
};
