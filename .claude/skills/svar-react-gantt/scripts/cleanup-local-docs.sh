#!/bin/bash

# SVAR React Gantt Skill - 로컬 문서 정리 스크립트
# 이제 실시간 공식 문서를 참조하므로 로컬 docSVAR 폴더가 필요 없습니다.

echo "🧹 SVAR React Gantt - 로컬 문서 정리 스크립트"
echo "================================================"
echo ""

# docSVAR 폴더 경로
DOCS_DIR="/Users/1ncarnati0n/Desktop/tsxPJT/docSVAR"

# 백업 경로
BACKUP_DIR="$HOME/Desktop/docSVAR_backup_$(date +%Y%m%d_%H%M%S)"

# 폴더 존재 확인
if [ ! -d "$DOCS_DIR" ]; then
    echo "❌ docSVAR 폴더를 찾을 수 없습니다: $DOCS_DIR"
    exit 1
fi

echo "📁 발견된 폴더: $DOCS_DIR"
echo ""

# 폴더 크기 확인
FOLDER_SIZE=$(du -sh "$DOCS_DIR" | cut -f1)
echo "📊 폴더 크기: $FOLDER_SIZE"
echo ""

# 사용자 확인
echo "다음 중 선택하세요:"
echo ""
echo "1) 백업 후 삭제 (권장)"
echo "2) 백업 없이 삭제"
echo "3) 취소"
echo ""
read -p "선택 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📦 백업 생성 중..."
        cp -R "$DOCS_DIR" "$BACKUP_DIR"
        
        if [ $? -eq 0 ]; then
            echo "✅ 백업 완료: $BACKUP_DIR"
            echo ""
            echo "🗑️  원본 폴더 삭제 중..."
            rm -rf "$DOCS_DIR"
            
            if [ $? -eq 0 ]; then
                echo "✅ 삭제 완료!"
                echo ""
                echo "💡 이제 Claude가 실시간으로 공식 문서를 참조합니다."
                echo "   백업 파일: $BACKUP_DIR"
            else
                echo "❌ 삭제 실패"
                exit 1
            fi
        else
            echo "❌ 백업 실패"
            exit 1
        fi
        ;;
    2)
        echo ""
        read -p "⚠️  정말로 백업 없이 삭제하시겠습니까? (yes/no): " confirm
        
        if [ "$confirm" = "yes" ]; then
            echo "🗑️  삭제 중..."
            rm -rf "$DOCS_DIR"
            
            if [ $? -eq 0 ]; then
                echo "✅ 삭제 완료!"
                echo ""
                echo "💡 이제 Claude가 실시간으로 공식 문서를 참조합니다."
            else
                echo "❌ 삭제 실패"
                exit 1
            fi
        else
            echo "❌ 취소됨"
            exit 0
        fi
        ;;
    3)
        echo "❌ 취소됨"
        exit 0
        ;;
    *)
        echo "❌ 잘못된 선택"
        exit 1
        ;;
esac

echo ""
echo "🎉 완료!"
echo ""
echo "📚 이제 다음과 같이 질문하세요:"
echo "   - 'SVAR Gantt 최신 버전 확인해줘'"
echo "   - '공식 문서에서 scales 설정 방법 찾아줘'"
echo "   - 'RestDataProvider 최신 사용법 알려줘'"
echo ""

