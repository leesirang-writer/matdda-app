import Link from "next/link";
import styles from "./admin.module.css";
import { isAdmin } from "@/lib/admin-session";
import { adminLogin, adminLogout } from "./actions";
import { getAdminPlaces, getAdminReviews } from "./admin-queries";
import PlacesPanel from "./places-panel";
import ReviewsPanel from "./reviews-panel";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await isAdmin();

  if (!admin) {
    const params = await searchParams;
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginLock}>🔒</div>
          <h1 className={styles.loginTitle}>관리자 페이지</h1>
          <p className={styles.loginDesc}>
            장소 정보 큐레이션과 리뷰 관리는 관리자 비밀번호가 있어야 볼 수 있어요.
          </p>

          {params.error && <div className={styles.loginError}>{params.error}</div>}

          <form action={adminLogin} className={styles.loginForm}>
            <input
              type="password"
              name="password"
              placeholder="관리자 비밀번호"
              autoFocus
              required
              className={styles.loginInput}
            />
            <button type="submit" className={styles.loginButton}>
              입장하기
            </button>
          </form>

          <Link href="/" className={styles.backLink}>
            ← 피드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const [places, reviews] = await Promise.all([getAdminPlaces(), getAdminReviews()]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>⚙️ 관리자</h1>
            <div className={styles.headerActions}>
              <Link href="/" className={styles.backLink}>
                피드로
              </Link>
              <form action={adminLogout}>
                <button type="submit" className={styles.logoutButton}>
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📍 장소 관리 ({places.length}곳)</h2>
          <p className={styles.sectionDesc}>
            대표 메뉴와 대표 사진(파일 업로드 또는 URL)을 채워두면 메인 피드
            카드에 바로 반영돼요. 잘못 등록됐거나 폐업한 곳은 각 카드 하단에서
            삭제할 수 있어요.
          </p>
          <PlacesPanel places={places} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📝 리뷰 관리 ({reviews.length}건)</h2>
          <p className={styles.sectionDesc}>
            테스트용이거나 부적절한 리뷰는 바로 삭제할 수 있어요.
          </p>
          <ReviewsPanel reviews={reviews} />
        </section>
      </div>
    </div>
  );
}
