import * as React from 'react';
import QRCode from 'react-qr-code';
import { Modal } from '../component';
import * as Styled from './styles';

interface QrCodeModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  photoSessionUrl: string | null;
  generatePhotoSessionUrl: () => void;
}

export function QrCodeModal({
  isOpen,
  onRequestClose,
  photoSessionUrl = null,
  generatePhotoSessionUrl,
}: QrCodeModalProps): React.ReactElement {
  React.useEffect(() => {
    if (isOpen) {
      if (photoSessionUrl == null) {
        generatePhotoSessionUrl();
      }
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Mobile Photo Capture"
      size="default"
    >
      {photoSessionUrl && (
        <>
          <Styled.QRCodeWrapper>
            <QRCode
              value={photoSessionUrl}
              size={200}
              style={{ height: 'auto', maxWidth: '50%', width: '50%' }}
            />
          </Styled.QRCodeWrapper>
          <Styled.Description>
            <strong>Scan with your phone to take and submit photos</strong>
          </Styled.Description>
        </>
      )}
    </Modal>
  );
}
