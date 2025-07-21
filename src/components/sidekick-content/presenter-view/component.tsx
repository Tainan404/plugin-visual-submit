import * as React from 'react';
import {
  PluginApi,
  CurrentUserData,
  DataChannelTypes,
  RESET_DATA_CHANNEL,
  DataChannelEntryResponseType,
  DeleteEntryFunction, GraphqlResponseWrapper, UsersBasicInfoResponseFromGraphqlWrapper,
} from 'bigbluebutton-html-plugin-sdk';
import * as Styled from './styles';
import * as DefaultStyled from '../shared/styles';
import * as CommonStyled from '../../../styles/common';
import { formatUploadTime } from '../../../utils/formatUploadTime';
import { PrintIcon, TrashIcon } from '../../../utils/icons';
import { DeleteConfirmationModal } from '../../modal/delete-confirmation/component';
import { handlePrintSubmissions } from '../../../utils/printSubmissions';
import { SubmitImage } from '../../visual-submit/types';
import { sortUserGroupsWithPriority } from '../../../utils/sortUserGroups';

interface PresenterSidekickAreaProps {
  pluginApi: PluginApi;
  currentUser: CurrentUserData;
  handleViewFile: (
    fileUrl: string,
    submissionData?: {
      userId: string;
      userName: string;
      imageIndex?: number;
      totalImages?: number;
    },
    entryId?: string,
  ) => void;
  deleteSubmitImage: DeleteEntryFunction;
}

export function PresenterSidekickArea({
  pluginApi,
  currentUser,
  deleteSubmitImage,
  handleViewFile,
}: PresenterSidekickAreaProps): React.ReactElement {
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState<boolean>(false);
  const [clearAllModalOpen, setClearAllModalOpen] = React.useState<boolean>(false);
  const [pendingDeleteEntryId, setPendingDeleteEntryId] = React.useState<string | null>(null);

  const allUsersInfo: GraphqlResponseWrapper<UsersBasicInfoResponseFromGraphqlWrapper> = pluginApi
    .useUsersBasicInfo();

  const {
    data: submitImageResponseData,
  } = pluginApi.useDataChannel<SubmitImage>('submitImage', DataChannelTypes.ALL_ITEMS);

  // Handle individual image deletion
  const handleDeleteImage = React.useCallback((entryId: string) => {
    setPendingDeleteEntryId(entryId);
    setDeleteModalOpen(true);
  }, []);

  const confirmDeleteImage = React.useCallback(() => {
    if (pendingDeleteEntryId) {
      deleteSubmitImage([pendingDeleteEntryId]);
      setPendingDeleteEntryId(null);
    }
  }, [deleteSubmitImage, pendingDeleteEntryId]);

  const cancelDeleteImage = React.useCallback(() => {
    setDeleteModalOpen(false);
    setPendingDeleteEntryId(null);
  }, []);

  // Handle clear all images
  const handleClearAll = React.useCallback(() => {
    setClearAllModalOpen(true);
  }, []);

  const confirmClearAll = React.useCallback(() => {
    deleteSubmitImage([RESET_DATA_CHANNEL]);
  }, [deleteSubmitImage]);

  const cancelClearAll = React.useCallback(() => {
    setClearAllModalOpen(false);
  }, []);

  const submittedImages = submitImageResponseData?.data || [];

  // Filter images by selected user
  const filteredImages = React.useMemo(() => {
    if (!selectedUserId) return submittedImages;
    return submittedImages?.filter((image) => (
      image.payloadJson.submittedBy.userId === selectedUserId
    ));
  }, [submittedImages, selectedUserId]);

  // Group images by all users in the meeting
  const groupedImages = React.useMemo(() => {
    if (!allUsersInfo?.data?.user) return [];

    const groups = new Map<string, {
      user: { userId: string; userName: string; };
      images: DataChannelEntryResponseType<SubmitImage>[];
    }>();

    // Initialize groups for all users (exclude current user/presenter)
    allUsersInfo.data.user.forEach((user) => {
      const isNotCurrentUser = user.userId !== currentUser.userId;
      const isSelectedUser = !selectedUserId || user.userId === selectedUserId;

      if (isNotCurrentUser && isSelectedUser) {
        groups.set(user.userId, {
          user: { userId: user.userId, userName: user.name },
          images: [],
        });
      }
    });

    // Add images to respective user groups
    filteredImages.forEach((image) => {
      const { submittedBy } = image.payloadJson;
      const group = groups.get(submittedBy.userId);
      if (group) {
        group.images.push(image);
      }
    });

    return Array.from(groups.values());
  }, [filteredImages, allUsersInfo?.data?.user, selectedUserId, currentUser.userId]);

  // Sorted user groups for consistent ordering
  const sortedUserGroups = React.useMemo(() => (
    sortUserGroupsWithPriority(groupedImages)
  ), [groupedImages]);

  return (
    <DefaultStyled.BaseContainer>
      <Styled.PresenterTitle>
        Submitted Visual Content
        {' '}
        {filteredImages?.length > 0 && `(${filteredImages?.length})`}
      </Styled.PresenterTitle>

      {(allUsersInfo?.data?.user?.length || 0) > 0 && (
        <Styled.PresenterFilterContainer>
          <Styled.PresenterUserFilterSelect
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
            aria-label="Filter by user"
            name="userFilter"
          >
            <option value="">All Users</option>
            {sortedUserGroups.map((userGroup) => {
              const imageCount = userGroup.images.length;
              return (
                <option key={userGroup.user.userId} value={userGroup.user.userId}>
                  {userGroup.user.userName}
                  {' ('}
                  {imageCount}
                  )
                </option>
              );
            })}
          </Styled.PresenterUserFilterSelect>

          <Styled.ButtonGroup>
            <Styled.DeleteButton
              type="button"
              onClick={handleClearAll}
              disabled={submittedImages.length === 0}
              aria-label="Clear All submissions"
              title="Clear All submissions"
            >
              Clear All
              <TrashIcon />
            </Styled.DeleteButton>
            <Styled.PrintButton
              type="button"
              onClick={() => handlePrintSubmissions(groupedImages)}
            >
              <PrintIcon />
            </Styled.PrintButton>
          </Styled.ButtonGroup>
        </Styled.PresenterFilterContainer>
      )}

      {groupedImages.length === 0 ? (
        <Styled.PresenterEmptyState>
          No users found.
        </Styled.PresenterEmptyState>
      ) : (
        <Styled.PresenterFilesList>
          {sortedUserGroups.map((userGroup) => (
            <div key={userGroup.user.userId}>
              {userGroup.images.length === 0 ? (
                <>
                  <Styled.PresenterUserHeader>
                    {userGroup.user.userName}
                  </Styled.PresenterUserHeader>
                  <DefaultStyled.EmptyState>
                    No images have been submitted yet
                  </DefaultStyled.EmptyState>
                </>
              ) : (
                <>
                  <Styled.PresenterUserHeader>
                    {userGroup.user.userName}
                    {' ('}
                    {userGroup.images.length}
                    )
                  </Styled.PresenterUserHeader>

                  <Styled.PresenterUserImagesContainer>
                    {userGroup.images.map((
                      file: {
                        payloadJson: { imageUrl: string }, entryId: string, createdAt: string
                      },
                      index: number,
                    ) => {
                      const { imageUrl, isCorrect } = file.payloadJson as SubmitImage;

                      return (
                        <Styled.PresenterFileItem key={file.entryId} style={{ marginBottom: '10px' }}>
                          <CommonStyled.ImageNumber>
                            {userGroup.images.length - index}
                          </CommonStyled.ImageNumber>
                          <DefaultStyled.ImageThumbnail
                            src={imageUrl}
                            validationStatus={isCorrect}
                            onClick={() => handleViewFile(imageUrl, {
                              userId: userGroup.user.userId,
                              userName: userGroup.user.userName,
                              imageIndex: index + 1,
                              totalImages: userGroup.images.length,
                            }, file.entryId)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleViewFile(imageUrl, {
                                  userId: userGroup.user.userId,
                                  userName: userGroup.user.userName,
                                  imageIndex: index + 1,
                                  totalImages: userGroup.images.length,
                                }, file.entryId);
                              }
                            }}
                          />

                          <DefaultStyled.Info>
                            <DefaultStyled.Text style={{ marginTop: '5px' }}>
                              Uploaded
                              {' '}
                              {formatUploadTime(new Date(file.createdAt))}
                            </DefaultStyled.Text>
                          </DefaultStyled.Info>

                          <Styled.PresenterActionButtons>
                            <CommonStyled.DeleteButton
                              onClick={() => handleDeleteImage(file.entryId)}
                            >
                              <TrashIcon />
                            </CommonStyled.DeleteButton>
                          </Styled.PresenterActionButtons>
                        </Styled.PresenterFileItem>
                      );
                    })}
                  </Styled.PresenterUserImagesContainer>
                </>
              )}
            </div>
          ))}
        </Styled.PresenterFilesList>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onConfirm={confirmDeleteImage}
        onCancel={cancelDeleteImage}
      />

      <DeleteConfirmationModal
        isOpen={clearAllModalOpen}
        onConfirm={confirmClearAll}
        onCancel={cancelClearAll}
        title="Clear All Images"
        message="Are you sure you want to clear all submitted images? This action cannot be undone."
      />
    </DefaultStyled.BaseContainer>
  );
}
