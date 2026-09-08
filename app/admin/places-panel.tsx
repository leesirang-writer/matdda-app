"use client";

import { useMemo, useState } from "react";
import styles from "./admin.module.css";
import { createPlace, updatePlaceExtras, deletePlace } from "./actions";
import type { AdminPlace } from "./admin-queries";

const PLACE_TYPE_LABEL: Record<AdminPlace["place_type"], string> = {
  meal: "식사",
  cafe: "카페",
  both: "식사+카페",
};

export default function PlacesPanel({ places }: { places: AdminPlace[] }) {
  const [query, setQuery] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  // 리뷰 작성 폼(review-form.tsx)과 같은 방식: 90개 정도라 서버 왕복 없이
  // 클라이언트에서 바로 필터링한다.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.road_address ?? "").toLowerCase().includes(q)
    );
  }, [places, query]);

  return (
    <div>
      <button
        type="button"
        className={styles.newPlaceToggle}
        onClick={() => setShowNewForm((v) => !v)}
      >
        {showNewForm ? "− 새 장소 추가 접기" : "+ 새 장소 추가 (을지로3가 힙플레이스 등)"}
      </button>

      {showNewForm && <NewPlaceForm onDone={() => setShowNewForm(false)} />}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`장소명·카테고리·주소로 검색 (전체 ${places.length}곳)`}
        className={styles.searchInput}
      />
      <div className={styles.resultCount}>{filtered.length}곳 표시 중</div>

      <div className={styles.placeList}>
        {filtered.map((p) => (
          <PlaceRow key={p.id} place={p} />
        ))}
        {filtered.length === 0 && (
          <div className={styles.emptyState}>검색 결과가 없어요.</div>
        )}
      </div>
    </div>
  );
}

function NewPlaceForm({ onDone }: { onDone: () => void }) {
  return (
    <form
      action={async (formData: FormData) => {
        await createPlace(formData);
        onDone();
      }}
      className={styles.newPlaceForm}
    >
      <p className={styles.newPlaceHint}>
        정확한 지도 좌표는 몰라도 괜찮아요 — 이름과 대략적인 도보 시간만 있어도
        피드에 바로 뜹니다. 카카오맵 링크는 있으면 넣어주세요.
      </p>

      <label className={styles.fieldLabel}>
        장소 이름 *
        <input
          type="text"
          name="name"
          required
          placeholder="예: 올디스타코 을지로점"
          className={styles.fieldInput}
        />
      </label>

      <label className={styles.fieldLabel}>
        카테고리
        <input
          type="text"
          name="category"
          placeholder="예: 음식점 > 멕시칸 > 타코"
          className={styles.fieldInput}
        />
      </label>

      <label className={styles.fieldLabel}>
        도로명 주소
        <input
          type="text"
          name="road_address"
          placeholder="예: 서울 중구 을지로 15길 ..."
          className={styles.fieldInput}
        />
      </label>

      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>
          장소 타입 *
          <select name="place_type" defaultValue="meal" className={styles.fieldSelect}>
            <option value="meal">식사</option>
            <option value="cafe">카페</option>
            <option value="both">식사+카페</option>
          </select>
        </label>
        <label className={styles.fieldLabel}>
          도보 시간(분)
          <input
            type="number"
            name="walk_minutes"
            min={0}
            max={60}
            placeholder="예: 13"
            className={styles.fieldInput}
          />
        </label>
      </div>

      <label className={styles.fieldLabel}>
        대표 메뉴
        <input
          type="text"
          name="signature_menu"
          placeholder="예: 알파스토르 타코"
          className={styles.fieldInput}
        />
      </label>

      <label className={styles.fieldLabel}>
        대표 사진
        <input type="file" name="photo" accept="image/*" className={styles.fieldFileInput} />
      </label>
      <label className={styles.fieldLabel}>
        또는 사진 URL 직접 입력 (선택 — 위에서 파일을 올리면 이 값은 무시돼요)
        <input type="text" name="image_url" placeholder="https://..." className={styles.fieldInput} />
      </label>

      <label className={styles.fieldLabel}>
        카카오맵 링크 (선택)
        <input type="text" name="kakao_url" placeholder="https://place.map.kakao.com/..." className={styles.fieldInput} />
      </label>

      <label className={styles.trendyToggleLabel}>
        <input type="checkbox" name="is_trendy" className={styles.trendyCheckbox} />
        🔥 20대 트렌드 핫플로 표시
      </label>

      <button type="submit" className={styles.saveButton}>
        새 장소 등록
      </button>
    </form>
  );
}

function PlaceRow({ place }: { place: AdminPlace }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className={styles.placeRow}>
      <div className={styles.placeRowHeader}>
        <span className={styles.placeName}>{place.name}</span>
        <span className={styles.placeMeta}>
          {place.category ?? "카테고리 없음"}
          {place.road_address ? ` · ${place.road_address}` : ""}
          {place.walk_minutes != null ? ` · 도보 ${place.walk_minutes}분` : ""}
          {` · ${PLACE_TYPE_LABEL[place.place_type]}`}
        </span>
      </div>

      <form action={updatePlaceExtras} className={styles.placeEditForm}>
        <input type="hidden" name="place_id" value={place.id} />

        {place.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.image_url} alt="" className={styles.placeThumb} />
        )}

        <label className={styles.fieldLabel}>
          대표 메뉴
          <input
            type="text"
            name="signature_menu"
            defaultValue={place.signature_menu ?? ""}
            placeholder="예: 나주곰탕"
            className={styles.fieldInput}
          />
        </label>

        <label className={styles.fieldLabel}>
          대표 사진 {place.image_url ? "교체" : "업로드"}
          <input type="file" name="photo" accept="image/*" className={styles.fieldFileInput} />
        </label>
        <label className={styles.fieldLabel}>
          또는 사진 URL 직접 입력 (선택 — 위에서 파일을 올리면 이 값은 무시돼요)
          <input
            type="text"
            name="image_url"
            defaultValue={place.image_url ?? ""}
            placeholder="https://..."
            className={styles.fieldInput}
          />
        </label>

        <label className={styles.trendyToggleLabel}>
          <input
            type="checkbox"
            name="is_trendy"
            defaultChecked={place.is_trendy}
            className={styles.trendyCheckbox}
          />
          🔥 20대 트렌드 핫플로 표시
        </label>

        <button type="submit" className={styles.saveButton}>
          저장
        </button>
      </form>

      <div className={styles.rowFooter}>
        {confirmingDelete ? (
          <div className={styles.deleteConfirmRow}>
            <span className={styles.deleteConfirmText}>
              정말 삭제할까요?
              {place.review_count > 0
                ? ` 여기 달린 리뷰 ${place.review_count}건도 함께 삭제되고, 되돌릴 수 없어요.`
                : " 되돌릴 수 없어요."}
            </span>
            <form action={deletePlace} className={styles.deleteConfirmActions}>
              <input type="hidden" name="place_id" value={place.id} />
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setConfirmingDelete(false)}
              >
                취소
              </button>
              <button type="submit" className={styles.deleteButton}>
                정말 삭제
              </button>
            </form>
          </div>
        ) : (
          <button
            type="button"
            className={styles.deleteLinkButton}
            onClick={() => setConfirmingDelete(true)}
          >
            🗑️ 이 업체 삭제
          </button>
        )}
      </div>
    </div>
  );
}
