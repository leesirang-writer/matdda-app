"use client";

import { useMemo, useState } from "react";
import { submitReview } from "./actions";

type Place = {
  id: string;
  name: string;
  place_type: "meal" | "cafe" | "both";
  category: string | null;
  address: string | null;
  walk_minutes: number | null;
};

const PURPOSES: { value: string; label: string }[] = [
  { value: "client", label: "👔 클라이언트 접대" },
  { value: "remote_work", label: "💻 자유 외근" },
  { value: "lunch", label: "🍚 점심" },
  { value: "dinner", label: "🍻 회식" },
  { value: "cafe", label: "☕ 커피" },
];

const VERDICTS: { value: string; label: string }[] = [
  { value: "again", label: "또 갈래요" },
  { value: "ok", label: "보통" },
  { value: "no", label: "굳이" },
];

export function ReviewForm({
  places,
  hasNickname,
  initialPlaceId,
}: {
  places: Place[];
  hasNickname: boolean;
  initialPlaceId?: string;
}) {
  const [query, setQuery] = useState("");
  // 상세 페이지의 "이 장소에 리뷰 남기기" 버튼처럼 place_id를 들고 들어온 경우,
  // 해당 장소가 목록에 실제로 있을 때만 미리 선택해준다 (없는 id면 무시).
  const [placeId, setPlaceId] = useState(
    initialPlaceId && places.some((p) => p.id === initialPlaceId) ? initialPlaceId : ""
  );
  const [purpose, setPurpose] = useState("");
  const [verdict, setVerdict] = useState("");
  // 접대/외근 꿀팁 체크리스트: "있음/없음/모름" 3단 확인. 기본은 모름(빈 값)이라
  // 아무것도 안 누르면 기존처럼 해당 항목을 건드리지 않는다 (다른 사람이 이미
  // 확인해둔 값을 실수로 지우지 않기 위함).
  const [facility, setFacility] = useState<Record<string, "true" | "false">>({});
  function setFact(name: string, value: "true" | "false" | "unknown") {
    setFacility((prev) => {
      if (value === "unknown") {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: value };
    });
  }

  const selectedPlace = places.find((p) => p.id === placeId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places.slice(0, 20);
    return places.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [places, query]);

  return (
    <form
      action={submitReview}
      style={{ display: "flex", flexDirection: "column", gap: 22 }}
    >
      {/* 1. 장소 검색 */}
      <section>
        <label style={labelStyle}>어디 다녀오셨어요?</label>
        <input
          type="text"
          placeholder="식당/카페 이름 검색"
          value={selectedPlace ? selectedPlace.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPlaceId("");
          }}
          style={inputStyle}
        />
        {!selectedPlace && query && (
          <div style={listBoxStyle}>
            {filtered.length === 0 && (
              <div style={{ padding: 12, fontSize: 13, color: "#999" }}>
                검색 결과가 없어요
              </div>
            )}
            {filtered.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => {
                  setPlaceId(p.id);
                  setQuery("");
                }}
                style={listItemStyle}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  {p.address ?? ""} · 도보 {p.walk_minutes ?? "?"}분
                </div>
              </button>
            ))}
          </div>
        )}
        {selectedPlace && (
          <button
            type="button"
            onClick={() => setPlaceId("")}
            style={{ ...linkButtonStyle, marginTop: 6 }}
          >
            다른 곳으로 바꾸기
          </button>
        )}
        <input type="hidden" name="place_id" value={placeId} required />
      </section>

      {/* 2. 방문 목적 */}
      <section>
        <label style={labelStyle}>오늘 이곳엔 왜 가셨어요?</label>
        <div style={chipRowStyle}>
          {PURPOSES.map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => setPurpose(p.value)}
              style={purpose === p.value ? chipActiveStyle : chipStyle}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="purpose" value={purpose} required />
      </section>

      {/* 3. 접대 목적일 때만 보이는 접대 꿀팁 체크리스트 */}
      {purpose === "client" && (
        <section style={facilityBoxStyle}>
          <div style={facilityTitleStyle}>
            👔 접대 꿀팁 체크리스트 — 확실히 아는 것만 답해주세요 (선택)
          </div>
          <FacilityTriState
            name="has_room"
            label="룸/개별공간"
            value={facility.has_room}
            onChange={(v) => setFact("has_room", v)}
          />
          <FacilityTriState
            name="reservation_required"
            label="예약 필수"
            value={facility.reservation_required}
            onChange={(v) => setFact("reservation_required", v)}
          />
          <FacilityTriState
            name="has_parking"
            label="주차 가능"
            value={facility.has_parking}
            onChange={(v) => setFact("has_parking", v)}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13.5,
              marginTop: 10,
            }}
          >
            최대 수용 인원 (모르면 비워두세요)
            <input
              name="max_party_size"
              type="number"
              min={1}
              style={{ ...inputStyle, width: 80, marginTop: 0 }}
            />
            명
          </label>
        </section>
      )}

      {/* 4. 외근 목적일 때만 보이는 외근 꿀팁 체크리스트 */}
      {purpose === "remote_work" && (
        <section style={facilityBoxStyle}>
          <div style={facilityTitleStyle}>
            💻 외근 꿀팁 체크리스트 — 확실히 아는 것만 답해주세요 (선택)
          </div>
          <FacilityTriState
            name="has_outlet"
            label="콘센트"
            value={facility.has_outlet}
            onChange={(v) => setFact("has_outlet", v)}
          />
          <FacilityTriState
            name="is_quiet"
            label="조용해서 통화/작업 가능"
            value={facility.is_quiet}
            onChange={(v) => setFact("is_quiet", v)}
          />
          <FacilityTriState
            name="long_stay_ok"
            label="오래 앉아있어도 눈치 안 보임"
            value={facility.long_stay_ok}
            onChange={(v) => setFact("long_stay_ok", v)}
          />
        </section>
      )}

      {/* 5. 평가 */}
      <section>
        <label style={labelStyle}>다시 갈 것 같으세요?</label>
        <div style={chipRowStyle}>
          {VERDICTS.map((v) => (
            <button
              type="button"
              key={v.value}
              onClick={() => setVerdict(v.value)}
              style={verdict === v.value ? chipActiveStyle : chipStyle}
            >
              {v.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="verdict" value={verdict} required />
      </section>

      {/* 6. 한 줄 소감 */}
      <section>
        <label style={labelStyle}>한 줄 소감</label>
        <textarea
          name="content"
          required
          maxLength={500}
          rows={3}
          placeholder="예: 룸이 조용해서 대화하기 좋았어요"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </section>

      {/* 7. 숫자 정보 */}
      <section style={{ display: "flex", gap: 10 }}>
        <label style={{ flex: 1 }}>
          <span style={labelStyle}>1인당 얼마 나왔나요?</span>
          <input
            name="price_per_person"
            type="number"
            min={0}
            placeholder="12000"
            style={inputStyle}
          />
        </label>
        <label style={{ flex: 1 }}>
          <span style={labelStyle}>대기시간(분)</span>
          <input
            name="wait_minutes"
            type="number"
            min={0}
            placeholder="0"
            style={inputStyle}
          />
        </label>
      </section>
      <section style={{ display: "flex", gap: 10 }}>
        <label style={{ flex: 1 }}>
          <span style={labelStyle}>몇 명이었나요?</span>
          <input
            name="party_size"
            type="number"
            min={1}
            placeholder="2"
            style={inputStyle}
          />
        </label>
        <label style={{ flex: 1 }}>
          <span style={labelStyle}>방문일</span>
          <input
            name="visit_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            style={inputStyle}
          />
        </label>
      </section>

      {/* 8. 실명/별명 */}
      {hasNickname ? (
        <section>
          <label style={labelStyle}>이 리뷰, 어떻게 보일까요?</label>
          <div style={chipRowStyle}>
            <label style={radioLabelStyle}>
              <input type="radio" name="display_mode" value="name" defaultChecked />
              실명
            </label>
            <label style={radioLabelStyle}>
              <input type="radio" name="display_mode" value="nickname" />
              별명
            </label>
          </div>
        </section>
      ) : (
        <input type="hidden" name="display_mode" value="name" />
      )}

      {/* 9. 사진 */}
      <section>
        <label style={labelStyle}>사진 (선택)</label>
        <input type="file" name="photos" accept="image/*" multiple style={{ marginTop: 6 }} />
      </section>

      <button type="submit" style={submitButtonStyle}>
        리뷰 남기기
      </button>
    </form>
  );
}

// "있음/없음/모름" 3단 확인 UI. 실제 값은 hidden input으로 폼에 실려가고,
// 아무것도 선택하지 않으면(모름) 이 필드는 아예 폼에서 빈 값으로 전송되어
// 서버 쪽에서 "이 리뷰어는 확인 안 함"으로 처리되고 기존 값을 건드리지 않는다.
function FacilityTriState({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: "true" | "false" | undefined;
  onChange: (value: "true" | "false" | "unknown") => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 13.5, marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={() => onChange(value === "true" ? "unknown" : "true")}
          style={value === "true" ? triYesActiveStyle : triOptionStyle}
        >
          있음
        </button>
        <button
          type="button"
          onClick={() => onChange(value === "false" ? "unknown" : "false")}
          style={value === "false" ? triNoActiveStyle : triOptionStyle}
        >
          없음
        </button>
        <button
          type="button"
          onClick={() => onChange("unknown")}
          style={value === undefined ? triUnknownActiveStyle : triOptionStyle}
        >
          모름
        </button>
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 14,
  boxSizing: "border-box",
};
const chipRowStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const chipStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 999,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle,
  background: "#6C4CD8",
  borderColor: "#6C4CD8",
  color: "#fff",
};
const radioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13.5,
};
const facilityBoxStyle: React.CSSProperties = {
  background: "#f7f5ff",
  borderRadius: 12,
  padding: 14,
};
const facilityTitleStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: "#666",
  marginBottom: 8,
};
const triOptionStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 0",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#666",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};
const triYesActiveStyle: React.CSSProperties = {
  ...triOptionStyle,
  background: "#6C4CD8",
  borderColor: "#6C4CD8",
  color: "#fff",
};
const triNoActiveStyle: React.CSSProperties = {
  ...triOptionStyle,
  background: "#999",
  borderColor: "#999",
  color: "#fff",
};
const triUnknownActiveStyle: React.CSSProperties = {
  ...triOptionStyle,
  background: "#f0f0f0",
  borderColor: "#ddd",
  color: "#999",
};
const listBoxStyle: React.CSSProperties = {
  marginTop: 6,
  border: "1px solid #eee",
  borderRadius: 10,
  maxHeight: 220,
  overflowY: "auto",
};
const listItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  border: "none",
  borderBottom: "1px solid #f2f2f2",
  background: "#fff",
  cursor: "pointer",
};
const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#6C4CD8",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};
const submitButtonStyle: React.CSSProperties = {
  padding: "14px 0",
  borderRadius: 14,
  border: "none",
  background: "#6C4CD8",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};
