-- 返信が存在するのに status = 'open' になっているお問い合わせを 'answered' に修正
update inquiries
set status = 'answered'
where status = 'open'
  and exists (
    select 1 from inquiry_replies
    where inquiry_replies.inquiry_id = inquiries.id
  );
