"use client";

// "15초 꿀팁 제보" 팝업 — 2026-09-16(17차) "1초 반응 + 15초 꿀팁" 라이트
// 리뷰 전환의 핵심 컴포넌트. 기존 /reviews/new의 무거운 폼(방문목적/평가/
// 접대·외근 체크리스트/숫자 정보/사진 등 9단계)을 대체하는 게 아니라
// "가장 먼저 보여주는 가벼운 길"로 새로 만든 것 — /reviews/new는 사진과
// 함께 자세히 쓰고 싶은 사람을 위해 그대로 남겨뒀고, 이 모달 맨 아래에
// 그리로 가는 링크도 있다.
//
// 두 가지 진입 방식을 하나의 컴포넌트로 처리한다:
//   1) 카드/상세페이지에서 이미 장소를 알고 열림 → placeId/placeName/purpose
//      prop이 채워져 있어 바로 "평가 → 소속 → 팁" 3단계로 시작.
//   2) GNB "꿀팁 제보하기"처럼 장소를 모르는 채로 열림 → allPlaces를 받아
//      장소 검색 단계를 먼저 보여주고, 고르고 나면 place_type으로 목적을
//      추정(카페면 cafe, 아니면 lunch)해서 1)과 같은 흐름으로 이어간다.
import { useMemo, useState, useTransition } from "react";
import styles from "./quick-tip-modal.module.css";
import { submitQuickTip } from "./quick-tip-actions";
import { QUICK_TIP_DEPARTMENTS, type PlaceLite, type VotePurpose } from "./feed-display";

type SelectedPlace = { id: string; name: string; purpose: VotePurpose };

export function QuickTipModal({
  onClose,
  placeId,
  placeName,
  purpose,
  allPlaces,
}: {
  onClose: () => void;
  placeId?: string;
  placeName?: string;
  purpose?: VotePurpose;
  allPlaces?: PlaceLite[];
}) {
  const [selected, setSelected] = useState<SelectedPlace | null>(
    placeId && placeName && purpose ? { id: placeId, name: placeName, purpose } : null
  );
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState<"again" | "no" | null>(null);
  const [department, setDepartment] = useState("");
  const [tip, setTip] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPickPlace = !selected && allPlaces;
  const filteredPlaces = useMemo(() => {
    if (!allPlaces) return [];
    const q = query.trim().toLowerCase();
    if (!q) return allPlaces.slice(0, 20);
    return allPlaces.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [allPlaces, query]);

  const canSubmit = !!selected && !!verdict && !!department;

  function handleSubmit() {
    if (!canSubmit || !selected || !verdict) return;
    setError(null);
    const fd = new FormData();
    fd.set("place_id", selected.id);
    fd.set("purpose", selected.purpose);
    fd.set("verdict", verdict);
    fd.set("department", department);
    fd.set("tip", tip.trim());
    startTransition(async () => {
      const result = await submitQuickTip(fd);
      if (result.ok) {
        setDone(true);
        setTimeout(onClose, 1100);
      } else {
        setError(result.error ?? "저장하지 못했어요. 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className={styles.doneState}>
            <div className={styles.doneEmoji}>✅</div>
            <p>꿀팁 고마워요! 바로 반영됐어요.</p>
          </div>
        ) : (
          <>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>
                {selected ? selected.name : "꿀팁 제보하기"}
              </span>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <p className={styles.modalSubtitle}>
              15초면 충분해요 — 사진도, 긴 글도 필요 없어요.
            </p>

            {canPickPlace && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>어디 다녀오셨어요?</div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="식당/카페 이름 검색"
                  className={styles.tipInput}
                />
                <div className={styles.searchResults}>
                  {filteredPlaces.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className={styles.searchResultItem}
                      onClick={() =>
                        setSelected({
                          id: p.id,
                          name: p.name,
                          purpose: p.place_type === "cafe" ? "cafe" : "lunch",
                        })
                      }
                    >
                      <span className={styles.searchResultName}>{p.name}</span>
                      <span className={styles.searchResultMeta}>
                        {p.road_address ?? ""}
                      </span>
                    </button>
                  ))}
                  {filteredPlaces.length === 0 && (
                    <div className={styles.searchEmpty}>검색 결과가 없어요</div>
                  )}
                </div>
              </div>
            )}

            {selected && (
              <>
                {allPlaces && (
                  <button
                    type="button"
                    className={styles.changePlaceButton}
                    onClick={() => setSelected(null)}
                  >
                    다른 곳으로 바꾸기
                  </button>
                )}

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>1. 다시 갈 것 같으세요?</div>
                  <div className={styles.chipRow}>
                    <button
                      type="button"
                      className={verdict === "again" ? styles.chipActive : styles.chip}
                      onClick={() => setVerdict("again")}
                    >
                      🔥 또 갈래요!
                    </button>
                    <button
                      type="button"
                      className={verdict === "no" ? styles.chipActive : styles.chip}
                      onClick={() => setVerdict("no")}
                    >
                      🤔 굳이
                    </button>
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>2. 어느 소속이세요?</div>
                  <div className={styles.chipRow}>
                    {QUICK_TIP_DEPARTMENTS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        className={department === d ? styles.chipActive : styles.chip}
                        onClick={() => setDepartment(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>3. 1줄 사내 팁 (선택)</div>
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => setTip(e.target.value.slice(0, 80))}
                    placeholder="예: 창가 자리 뷰 좋음, 12시 10분 넘으면 웨이팅 생김"
                    className={styles.tipInput}
                    maxLength={80}
                  />
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                <button
                  type="button"
                  className={styles.submitButton}
                  disabled={!canSubmit || pending}
                  onClick={handleSubmit}
                >
                  {pending ? "등록 중..." : "등록하기"}
                </button>

                <a
                  href={`/reviews/new?place_id=${selected.id}`}
                  className={styles.secondaryLink}
                >
                  사진 첨부 등 더 자세히 쓰고 싶다면 →
                </a>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
