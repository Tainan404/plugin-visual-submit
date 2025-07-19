import * as React from 'react';
import { pluginLogger } from 'bigbluebutton-html-plugin-sdk';
import { Modal } from '../component';
import { ExternalLinkIcon } from '../../../utils/icons';
import * as Styled from './styles';

interface ImageViewModalProps {
  isOpen: boolean;
  submittedImageData: {
    imageUrl: string;
    submittedBy: {
      userId: string;
      userName: string;
    };
    imageIndex?: number;
    totalImages?: number;
    isCorrect?: boolean;
    feedback?: string;
  };
  onValidateImage: (isCorrect: boolean) => void;
  onSendFeedback: (feedback: string) => void;
  onRequestClose: () => void;
  isPresenter: boolean;
}

export function ImageViewModal({
  isOpen,
  onRequestClose,
  isPresenter = false,
  submittedImageData,
  onValidateImage,
  onSendFeedback,
}: ImageViewModalProps): React.ReactElement {
  const [feedback, setFeedback] = React.useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState<boolean>(false);
  const [feedbackJustSaved, setFeedbackJustSaved] = React.useState<boolean>(false);

  // Initialize validation state from isCorrect value
  const [validationState, setValidationState] = React.useState<boolean | null>(
    () => submittedImageData?.isCorrect ?? null,
  );

  // Reset validation state when modal opens/closes or when submittedImageData changes
  React.useEffect(() => {
    if (!isOpen) {
      setValidationState(null);
      setFeedback('');
      setFeedbackJustSaved(false);
    } else {
      setValidationState(submittedImageData?.isCorrect ?? null);
      setFeedback(submittedImageData?.feedback || '');
      setFeedbackJustSaved(false);
    }
  }, [isOpen, submittedImageData?.isCorrect, submittedImageData?.imageUrl]);

  // Update feedback when it changes in the data, but only if we're not in a "just saved" state
  React.useEffect(() => {
    if (isOpen && !feedbackJustSaved) {
      setFeedback(submittedImageData?.feedback || '');
    }
  }, [isOpen, submittedImageData?.feedback, feedbackJustSaved]);

  // Generate dynamic title for presenter view
  const modalTitle = React.useMemo(() => {
    if (
      isPresenter
      && submittedImageData?.submittedBy
      && submittedImageData?.imageIndex !== undefined
      && submittedImageData?.totalImages !== undefined
    ) {
      return `${submittedImageData.submittedBy.userName} - ${submittedImageData.totalImages - submittedImageData.imageIndex + 1}/${submittedImageData.totalImages}`;
    }
    return 'Submitted Visual Content';
  }, [isPresenter, submittedImageData]);

  const handleValidateImage = (isCorrect: boolean) => {
    setValidationState(isCorrect);

    if (onValidateImage) {
      onValidateImage(isCorrect);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedback.trim()) return;

    setIsSubmittingFeedback(true);
    try {
      if (onSendFeedback) {
        await onSendFeedback(feedback);
      }
      setFeedbackJustSaved(true);
    } catch (error) {
      pluginLogger.error('Error sending feedback:', error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (submittedImageData?.imageUrl) {
      window.open(submittedImageData.imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title={modalTitle}
      size="large"
    >
      <Styled.ImageContainer>
        <Styled.ImageWrapper>
          <Styled.Image
            src={submittedImageData?.imageUrl || ''}
            alt="Submitted visual content"
            validationStatus={submittedImageData?.isCorrect}
          />
          <Styled.ImageOverlay>
            <Styled.OpenInNewTabButton
              type="button"
              onClick={handleOpenInNewTab}
              title="Open image in new tab"
              aria-label="Open image in new tab"
            >
              <ExternalLinkIcon />
            </Styled.OpenInNewTabButton>
          </Styled.ImageOverlay>
        </Styled.ImageWrapper>
      </Styled.ImageContainer>

      {isPresenter && (
        <Styled.PresenterControls>

          <Styled.ValidationSection>
            <Styled.ValidationButtons>
              <Styled.ValidationButton
                type="button"
                onClick={() => handleValidateImage(true)}
                variant="correct"
                isSelected={validationState === true}
              >
                ✓ Correct
              </Styled.ValidationButton>
              <Styled.ValidationButton
                type="button"
                onClick={() => handleValidateImage(false)}
                variant="incorrect"
                isSelected={validationState === false}
              >
                ✗ Incorrect
              </Styled.ValidationButton>
            </Styled.ValidationButtons>
          </Styled.ValidationSection>

          <Styled.FeedbackSection>
            <Styled.FeedbackLabel>Send Feedback:</Styled.FeedbackLabel>
            <Styled.FeedbackInput
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (feedbackJustSaved) setFeedbackJustSaved(false);
              }}
              placeholder="Enter your feedback here..."
              rows={2}
            />
            <Styled.FeedbackButton
              type="button"
              onClick={handleSendFeedback}
              disabled={
                !feedback.trim()
                || isSubmittingFeedback
                || feedback === submittedImageData?.feedback
              }
            >
              {(() => {
                if (isSubmittingFeedback) return 'Sending...';
                if (feedbackJustSaved) return 'Feedback Saved!';
                return 'Save Feedback';
              })()}
            </Styled.FeedbackButton>
          </Styled.FeedbackSection>
        </Styled.PresenterControls>
      )}
    </Modal>
  );
}
