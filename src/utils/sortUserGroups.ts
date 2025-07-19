import type { DataChannelEntryResponseType } from 'bigbluebutton-html-plugin-sdk';
import type { SubmitImage } from '../components/visual-submit/types';

export interface UserGroup {
  user: { userId: string; userName: string; };
  images: DataChannelEntryResponseType<SubmitImage>[];
}

/**
 * Sorts user groups by:
 * 1. User name (alphabetical)
 * 2. Number of images (ascending)
 * 3. Oldest image timestamp (earliest first)
 */
export const sortUserGroups = (userGroups: UserGroup[]): UserGroup[] => (
  userGroups.sort((a, b) => {
    // 1. Compare user names
    const nameCompare = a.user.userName.localeCompare(b.user.userName);
    if (nameCompare !== 0) return nameCompare;

    // 2. Compare number of images
    const imageCountCompare = a.images.length - b.images.length;
    if (imageCountCompare !== 0) return imageCountCompare;

    // 3. Compare oldest image timestamp
    const aOldest = new Date(a.images[0]?.createdAt || 0).getTime();
    const bOldest = new Date(b.images[0]?.createdAt || 0).getTime();
    return aOldest - bOldest;
  })
);

/**
 * Sorts user groups with users who have images first, then users without images
 */
export const sortUserGroupsWithPriority = (userGroups: UserGroup[]): UserGroup[] => {
  const usersWithImages = userGroups.filter((group) => group.images.length > 0);
  const usersWithoutImages = userGroups.filter((group) => group.images.length === 0);

  return sortUserGroups(usersWithImages).concat(sortUserGroups(usersWithoutImages));
};
