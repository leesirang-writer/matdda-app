"use client";

import styles from "./admin.module.css";
import { deleteReview } from "./actions";
import type { AdminReview } from "./admin-queries";

const PURPOSE_LABEL: Record<string, string> = {
  client: "👔 접대",
  remote_work: "💻 외근",
  lunch: "🍚 점심",
  dinner: "🍻 회식",
  cafe: "☕ 커피",
};

export default function ReviewsPanel({ reviews }: { reviews: AdminReview[] }) {
  if (reviews.length === 0) {
    return <div className={styles.emptyState}>등록된 리뷰가 없어요.</div>;
  }

  return (
    <div className={styles.reviewList}>
      {reviews.map((r) => (
        <div key={r.id} className={styles.reviewRow}>
          <div className={styles.reviewRowHeader}>
            <span className={styles.reviewPlace}>{r.place_name}</span>
            <span className={styles.reviewPurpose}>
              {PURPOSE_LABEL[r.purpose] ?? r.purpose}
            </span>
          </div>
          <div className={styles.reviewAuthor}>
            {r.author_department ? `${r.author_department} · ` : ""}
            {r.author_name}
          </div>
          {r.content && <p className={styles.reviewContent}>{r.content}</p>}

          <form
            action={deleteReview}
            onSubmit={(e) => {
              if (!confirm("이 리뷰를 삭제할까요? 되돌릴 수 없어요.")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="review_id" value={r.id} />
            <button type="submit" className={styles.deleteButton}>
              삭제
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
