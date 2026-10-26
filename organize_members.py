#!/usr/bin/env python3
"""整理会员单位素材脚本"""
import os
import re
import json
import shutil
import subprocess
from pathlib import Path
from docx import Document

SOURCE = Path("/tmp/member-zip/官网企业简介")
TARGET_BASE = Path("/workspace/weifang-advertising-association/assets/members")

# 公司映射：slug -> (源目录名, 显示名, 副标题)
COMPANIES = [
    ("fenzhong-xin-cainiao", "分众传媒潍坊分公司--新菜鸟文化", "分众传媒潍坊分公司", "潍坊新菜鸟文化传媒"),
    ("baier", "山东拜尔文化科技有限公司", "山东拜尔文化科技有限公司", ""),
    ("daoersen", "山东道尔森传媒服务有限公司", "山东道尔森传媒服务有限公司", ""),
    ("jinqiao", "山东金桥广告装饰有限公司", "山东金桥广告装饰有限公司", ""),
    ("longxing", "山东龙行十万传媒有限公司", "山东龙行十万传媒有限公司", ""),
    ("hongyi", "弘易", "弘易", ""),
    ("hengrui", "恒瑞文化潍广通信息填报", "恒瑞文化", "潍广通信息填报"),
    ("shengli", "晟利", "晟利", ""),
    ("xin-ao", "欣澳", "欣澳", ""),
    ("hantang", "汉唐", "汉唐", ""),
    ("gongjiao", "潍坊市公共交通集团有限公司广告分公司（广告协会网站资料）", "潍坊市公共交通集团有限公司广告分公司", ""),
    ("shunze", "顺泽信息", "潍坊顺泽信息科技有限公司", ""),
]

# 忽略关键词
IGNORE_KEYWORDS = ["潍广通", "征集表", "招聘", "联系方式", "资源信息表", "资源信息征集表"]

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}

LOGO_KEYWORDS = ["logo", "LOGO"]
HONOR_KEYWORDS = ["荣誉", "honor", "文明单位", "诚信", "诚信经营", "获奖"]


def should_ignore(filename: str) -> bool:
    for kw in IGNORE_KEYWORDS:
        if kw.lower() in filename.lower():
            return True
    return False


def is_image(filepath: Path) -> bool:
    if filepath.suffix.lower() in IMAGE_EXTS:
        return True
    # 尝试用 file 命令检测真实类型
    try:
        result = subprocess.run(["file", "--mime-type", str(filepath)], capture_output=True, text=True)
        if "image/" in result.stdout.lower():
            return True
    except Exception:
        pass
    return False


def classify_image(filename: str) -> str:
    name_lower = filename.lower()
    for kw in LOGO_KEYWORDS:
        if kw.lower() in name_lower:
            return "logo"
    for kw in HONOR_KEYWORDS:
        if kw.lower() in name_lower:
            return "honors"
    return "gallery"


def extract_docx_text(docx_path: Path) -> str:
    """提取docx纯文本"""
    try:
        doc = Document(str(docx_path))
        lines = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                lines.append(text)
        # 也尝试从表格中提取
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    text = cell.text.strip()
                    if text:
                        lines.append(text)
        return "\n".join(lines)
    except Exception as e:
        print(f"  [WARN] 读取 docx 失败 {docx_path}: {e}")
        return ""


def doc_to_docx(doc_path: Path) -> Path | None:
    """用 pandoc 将 .doc 转为 .docx"""
    out = doc_path.with_suffix(".converted.docx")
    try:
        subprocess.run(
            ["pandoc", "-s", str(doc_path), "-o", str(out)],
            check=True, capture_output=True, text=True
        )
        return out
    except Exception as e:
        print(f"  [WARN] pandoc 转换失败 {doc_path}: {e}")
        return None


def pick_best_intro(files: list[Path]) -> Path | None:
    """按优先级选择简介文件：详细 > 详细介绍 > 简介 > 介绍"""
    candidates = [f for f in files if f.suffix.lower() in {".docx", ".doc"} and not should_ignore(f.name)]
    if not candidates:
        return None
    priority_keywords = [
        ("详细介绍", 0),
        ("详细", 1),
        ("简介", 2),
        ("介绍", 3),
    ]
    best = None
    best_score = 999
    for f in candidates:
        name = f.stem
        score = 999
        for kw, s in priority_keywords:
            if kw in name:
                score = s
                break
        if score < best_score:
            best_score = score
            best = f
    return best


def collect_all_files(root: Path) -> list[Path]:
    """递归收集所有文件"""
    result = []
    for p in root.rglob("*"):
        if p.is_file():
            result.append(p)
    return result


def process_company(slug: str, source_dirname: str, name: str, subname: str) -> dict:
    """处理一家公司"""
    src_dir = SOURCE / source_dirname
    target_dir = TARGET_BASE / slug

    # 创建目录结构
    for sub in ["logo", "gallery", "honors", "intro"]:
        (target_dir / sub).mkdir(parents=True, exist_ok=True)

    # 收集所有文件
    all_files = collect_all_files(src_dir)

    # 分类
    logo_files = []
    gallery_files = []
    honors_files = []
    other_docs = []

    for f in all_files:
        if should_ignore(f.name):
            print(f"  [SKIP] {f.name}")
            continue
        if is_image(f):
            cat = classify_image(f.name)
            if cat == "logo":
                logo_files.append(f)
            elif cat == "honors":
                honors_files.append(f)
            else:
                gallery_files.append(f)
        else:
            other_docs.append(f)

    # 复制图片，重命名避免冲突
    def copy_files(files: list[Path], subdir: str) -> list[str]:
        rel_paths = []
        used_names = set()
        for f in files:
            # 生成唯一文件名
            base_name = f.name
            if base_name in used_names:
                base_name = f"{f.stem}_{f.parent.name}{f.suffix}"
            used_names.add(base_name)
            dst = target_dir / subdir / base_name
            shutil.copy2(f, dst)
            rel_paths.append(f"{subdir}/{base_name}")
        return rel_paths

    logo_rel = copy_files(logo_files, "logo")
    gallery_rel = copy_files(gallery_files, "gallery")
    honors_rel = copy_files(honors_files, "honors")

    # 提取简介
    intro_candidates = [f for f in other_docs if f.suffix.lower() in {".docx", ".doc"}]
    best_intro = pick_best_intro(intro_candidates)
    bio_text = ""
    if best_intro:
        print(f"  [INTRO] 选用: {best_intro.name}")
        if best_intro.suffix.lower() == ".doc":
            docx = doc_to_docx(best_intro)
            if docx:
                bio_text = extract_docx_text(docx)
                docx.unlink(missing_ok=True)
        else:
            bio_text = extract_docx_text(best_intro)
        if bio_text:
            bio_path = target_dir / "intro" / "bio.txt"
            bio_path.write_text(bio_text, encoding="utf-8")
    else:
        print(f"  [INTRO] 未找到合适的简介文件")

    # 返回统计
    return {
        "slug": slug,
        "name": name,
        "subname": subname,
        "slug_dir": str(target_dir),
        "logo": logo_rel[0] if logo_rel else "",
        "bio": bio_text,
        "gallery": gallery_rel,
        "honors": honors_rel,
    }, {
        "logo_count": len(logo_rel),
        "gallery_count": len(gallery_rel),
        "honors_count": len(honors_rel),
        "bio_exists": bool(bio_text),
    }


def main():
    TARGET_BASE.mkdir(parents=True, exist_ok=True)
    results = []
    print("=" * 60)
    print("会员单位素材整理")
    print("=" * 60)

    for slug, source_dirname, name, subname in COMPANIES:
        print(f"\n>> 处理: {slug} ({name})")
        entry, stats = process_company(slug, source_dirname, name, subname)
        results.append(entry)
        print(f"  统计: logo={stats['logo_count']}, gallery={stats['gallery_count']}, "
              f"honors={stats['honors_count']}, bio={'YES' if stats['bio_exists'] else 'NO'}")

    # 写出 index.json
    index_path = TARGET_BASE / "index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print(f"完成！index.json 已生成: {index_path}")
    print("=" * 60)

    # 输出汇总表
    print(f"\n{'slug':<25} {'logo':>4} {'gallery':>7} {'honors':>7} {'bio':>5}")
    print("-" * 55)
    for slug, source_dirname, name, subname in COMPANIES:
        entry = next(r for r in results if r["slug"] == slug)
        stats = {
            "logo_count": 1 if entry["logo"] else 0,
            "gallery_count": len(entry["gallery"]),
            "honors_count": len(entry["honors"]),
            "bio_exists": bool(entry["bio"]),
        }
        print(f"{slug:<25} {stats['logo_count']:>4} {stats['gallery_count']:>7} {stats['honors_count']:>7} {'YES' if stats['bio_exists'] else 'NO':>5}")


if __name__ == "__main__":
    main()
