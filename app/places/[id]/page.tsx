import { notFound } from "next/navigation";
import styles from "./place-detail.module.css";
import { getPlaceDetail, getPlaceReviews, type PlaceReview } from "./place-queries";
import { simplifyCategory } from "@/app/feed-queries";
import PlaceHeaderActions from "./place-header-actions";
import PlaceTipLauncher from "./place-tip-launcher";

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

  // 외근용 팩트는 카페 성격 장소에서만 의미가 있으므로 place_type에 맞는
  // 섹션만 보여준다. (2026-09-16: "접대 꿀팁 체크리스트" 섹션은 사용자
  // 요청으로 상세 페이지에서 제거 — has_room/max_party_size/
  // reservation_required/has_parking 데이터 자체와 둘러보기 카드의 "룸
  // 있음"/"최대 인원" 배지(showClientBadges)는 그대로 유지.)
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

        {showRemoteFacts && (
          <section className={styles.factsSection}>
            <h2 className={styles.sectionTitle}>💻 외근 꿀팁 체크리스트</h2>
            <div className={styles.factGrid}>
              <FactRow label="콘센트" state={boolState(place.has_outlet)} />
              <FactRow label="조용함" state={boolState(place.is_quiet)} />
              <FactRow label="장시간 체류" state={boolState(place.long_stay_ok)} />
            </div>
          </section>
        )}

        <section className={styles.reviewsSection}>
          {/* 2026-09-16(17차): 게시판형 긴 리뷰 목록 대신 미쉐린/블루리본
              서베이 톤의 통계 요약을 먼저 보여준다 — "N명이 재방문을
              추천했어요" 식으로, 리뷰가 없어도 총무팀 픽이면 그 신뢰
              신호를, 그것도 없으면 참여를 독려하는 문구를 정직하게 보여줌
              (실패처럼 느껴지는 "0건" 표현은 쓰지 않음). */}
          {place.again_count > 0 ? (
            <div className={styles.statsBlock}>
              <span className={styles.statsEmoji}>🔥</span>
              <div className={styles.statsTextWrap}>
                <span className={styles.statsHeadline}>
                  동료 {place.again_count}명이 재방문을 추천했어요
                </span>
                <span className={styles.statsSub}>
                  재방문율 {place.again_rate ?? 0}% · 참여 {place.review_count}건
                </span>
              </div>
            </div>
          ) : place.is_staff_pick ? (
            <div className={styles.statsBlock}>
              <span className={styles.statsEmoji}>🎖️</span>
              <div className={styles.statsTextWrap}>
                <span className={styles.statsHeadline}>총무팀이 1차로 확인한 곳이에요</span>
                <span className={styles.statsSub}>
                  아직 동료 반응은 쌓이는 중이에요 — 첫 반응을 남겨보세요!
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.statsBlock}>
              <span className={styles.statsEmoji}>🙋</span>
              <div className={styles.statsTextWrap}>
                <span className={styles.statsHeadline}>아직 반응이 쌓이는 중이에요</span>
                <span className={styles.statsSub}>
                  첫 반응(또 갈래요/굳이)을 남기는 동료가 되어보세요!
                </span>
              </div>
            </div>
          )}

          <h2 className={`${styles.sectionTitle} ${styles.tipsTitle}`}>🗒️ 사내 꿀팁 모음</h2>

          {reviews.length === 0 ? (
            <div className={styles.emptyReviews}>
              아직 남겨진 꿀팁이 없어요.
              <br />
              한 줄 팁을 가장 먼저 남겨보세요!
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

      <PlaceTipLauncher placeId={place.id} placeName={place.name} placeType={place.place_type} />
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
      <p className={styles.reviewContent}>{review.content}</p>
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
