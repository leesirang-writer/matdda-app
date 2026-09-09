import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./place-detail.module.css";
import { getPlaceDetail, getPlaceReviews, type PlaceReview } from "./place-queries";
import { simplifyCategory } from "@/app/feed-queries";
import PlaceHeaderActions from "./place-header-actions";

const PURPOSE_LABEL: Record<string, string> = {
  client: "👔 클라이언트 접대",
  remote_work: "💻 자유 외근",
  lunch: "🍚 점심",
  dinner: "🍻 회식",
  cafe: "☕ 커피",
};

const VERDICT_LABEL: Record<string, string> = {
  again: "🔥 또 갈래요!",
  ok: "🙂 보통",
  no: "🤔 굳이",
};

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [place, reviews] = await Promise.all([getPlaceDetail(id), getPlaceReviews(id)]);
  if (!place) notFound();

  // 접대용 팩트는 식사 가능한 장소에서, 외근용 팩트는 카페 성격 장소에서만 의미가
  // 있으므로 place_type에 맞는 섹션만 보여준다.
  const showClientFacts = place.place_type === "meal" || place.place_type === "both";
  const showRemoteFacts = place.place_type === "cafe" || place.place_type === "both";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <PlaceHeaderActions placeName={place.name} />
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{place.name}</h1>
            <span className={styles.categoryBadge}>{simplifyCategory(place.category)}</span>
          </div>
        </header>

        <section className={styles.infoSection}>
          <div className={styles.infoRow}>
            🚶 남산스퀘어에서 도보 {place.walk_minutes ?? "?"}분
          </div>
          <div className={styles.infoRow}>📍 {place.road_address ?? "주소 정보 없음"}</div>
          {place.phone ? (
            <a className={styles.infoRowLink} href={`tel:${place.phone}`}>
              📞 {place.phone}
            </a>
          ) : (
            <div className={styles.infoRowMuted}>📞 전화번호 정보 없음</div>
          )}
          {place.kakao_url && (
            <a
              className={styles.kakaoButton}
              href={place.kakao_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              카카오맵에서 보기 ↗
            </a>
          )}
        </section>

        {(showClientFacts || showRemoteFacts) && (
          <section className={styles.factsSection}>
            {showClientFacts && (
              <>
                <h2 className={styles.sectionTitle}>👔 접대 꿀팁 체크리스트</h2>
                <div className={styles.factGrid}>
                  <FactRow label="룸/개별공간" state={boolState(place.has_room)} />
                  <FactRow
                    label="최대 인원"
                    state={place.max_party_size != null ? "yes" : "unknown"}
                    yesText={place.max_party_size != null ? `${place.max_party_size}명` : undefined}
                  />
                  <FactRow label="예약 필수" state={boolState(place.reservation_required)} />
                  <FactRow label="주차 가능" state={boolState(place.has_parking)} />
                </div>
              </>
            )}
            {showRemoteFacts && (
              <>
                <h2 className={styles.sectionTitle}>💻 외근 꿀팁 체크리스트</h2>
                <div className={styles.factGrid}>
                  <FactRow label="콘센트" state={boolState(place.has_outlet)} />
                  <FactRow label="조용함" state={boolState(place.is_quiet)} />
                  <FactRow label="장시간 체류" state={boolState(place.long_stay_ok)} />
                </div>
              </>
            )}
          </section>
        )}

        <section className={styles.reviewsSection}>
          <div className={styles.reviewsHeader}>
            <h2 className={styles.sectionTitle}>사내 동료 리뷰</h2>
            {place.review_count > 0 && (
              <span className={styles.againBadge}>또 갈래요 {place.again_rate ?? 0}%</span>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className={styles.emptyReviews}>
              아직 등록된 사내 리뷰가 없어요.
              <br />
              첫 번째 족보를 남겨주세요!
            </div>
          ) : (
            <div className={styles.reviewList}>
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </section>

        <div className={styles.bottomSpacer} />
      </div>

      <Link href={`/reviews/new?place_id=${place.id}`} className={styles.ctaBar}>
        ✍️ 이 장소에 리뷰 남기기
      </Link>
    </div>
  );
}

function boolState(v: boolean | null): "yes" | "no" | "unknown" {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "unknown";
}

function FactRow({
  label,
  state,
  yesText,
}: {
  label: string;
  state: "yes" | "no" | "unknown";
  yesText?: string;
}) {
  const cls =
    state === "yes" ? styles.factYes : state === "no" ? styles.factNo : styles.factUnknown;
  const text =
    state === "unknown" ? "동료의 확인이 필요해요" : state === "yes" ? yesText ?? "있음" : "없음";
  return (
    <div className={styles.factItem}>
      <span className={styles.factLabel}>{label}</span>
      <span className={cls}>{text}</span>
    </div>
  );
}

function ReviewCard({ review }: { review: PlaceReview }) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewAuthorRow}>
        <span className={styles.reviewAuthor}>
          {review.author_department ? `${review.author_department} · ` : ""}
          {review.author_display_name}
        </span>
        <span className={styles.verdictTag}>{VERDICT_LABEL[review.verdict] ?? review.verdict}</span>
      </div>
      <span className={styles.purposeTag}>{PURPOSE_LABEL[review.purpose] ?? review.purpose}</span>
      {review.content && <p className={styles.reviewContent}>{review.content}</p>}
      <div className={styles.reviewMeta}>
        {review.price_per_person != null && (
          <span>1인 {review.price_per_person.toLocaleString()}원</span>
        )}
        {review.wait_minutes != null && <span>대기 {review.wait_minutes}분</span>}
        {review.party_size != null && <span>{review.party_size}명 방문</span>}
      </div>
    </div>
  );
}
