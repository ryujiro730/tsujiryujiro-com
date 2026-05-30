-- opegra_photosに動画対応のmedia_typeカラムを追加
alter table opegra_photos
  add column if not exists media_type text not null default 'image';

alter table opegra_photos
  drop constraint if exists opegra_photos_media_type_check;

alter table opegra_photos
  add constraint opegra_photos_media_type_check
  check (media_type in ('image', 'video'));
