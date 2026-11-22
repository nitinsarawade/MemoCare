import { http, unwrap, API_ORIGIN } from './client';

export const mediaService = {
  list: (patientId, mediaType) =>
    unwrap(http.get(`/patients/${patientId}/media`, { params: mediaType ? { mediaType } : undefined })),
  get: (mediaId) => unwrap(http.get(`/media/${mediaId}`)),
  getUrl: (mediaId) => unwrap(http.get(`/media/${mediaId}/url`)),

  /**
   * Uploads a recording (multipart/form-data, field "file").
   * `runAnalysis` is only ever sent as the string "true": the backend parses it with
   * z.coerce.boolean(), which would turn the string "false" into true too.
   */
  upload(patientId, { file, assessmentTag, durationSeconds, onProgress }) {
    const isVideo = file.type
      ? file.type.startsWith('video/')
      : /\.(mov|mp4|m4v|webm|mkv|avi|3gp)$/i.test(file.name); // Windows often gives .mov an empty type
    const form = new FormData();
    form.append('file', file, file.name);
    if (assessmentTag) form.append('assessmentTag', assessmentTag);
    if (durationSeconds && durationSeconds > 0) form.append('durationSeconds', String(Math.round(durationSeconds)));
    form.append('runAnalysis', 'true');
    return unwrap(
      http.post(`/patients/${patientId}/media/${isVideo ? 'video' : 'audio'}`, form, {
        timeout: 0, // big files on slow links
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
    );
  },

  /**
   * Media served by this API's local storage driver requires the Bearer token, which
   * <audio>/<img> tags can't send. So protected local URLs are fetched as a Blob and
   * handed back as an object URL. A real signed S3 URL is returned as-is.
   */
  async fetchPlayableUrl(mediaId) {
    const { url } = await mediaService.getUrl(mediaId);
    if (!url.startsWith(API_ORIGIN)) return { url, revoke: () => {} };
    const path = url.slice(API_ORIGIN.length).replace(/^\/api\/v1/, '');
    const res = await http.get(path, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(res.data);
    return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
  },
};
