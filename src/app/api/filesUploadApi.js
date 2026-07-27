import { UPLOADFILE } from './Config';
import { getToken } from '../utils/storage';

export const filesUploadApi = async ({ attachments, folderName, uniqueNo }) => {
  const userToken = getToken();
  const ukey = userToken?.ukey ?? '';
  const formData = new FormData();
  console.log('ukey',userToken)

  attachments?.forEach((item) => {
    if (item.file) {
      formData.append('fileType', item.file);
    } else if (item.url) {
      formData.append('urls', item.url);
    }
  });

  formData.append('folderName', folderName);
  formData.append('uKey', ukey);
  formData.append('uniqueNo', uniqueNo);

  try {
    const response = await fetch(UPLOADFILE(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(response.statusText || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};
