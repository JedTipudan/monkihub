<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes"/>

  <xsl:template match="/messages">
    <div class="xml-output">
      <h3>&#128232; Messages (XSLT Transformed)</h3>

      <!-- Summary -->
      <div class="xslt-summary">
        <span>Total Messages: <strong><xsl:value-of select="count(message)"/></strong></span>
        <span>Unique Senders: <strong><xsl:value-of select="count(message[not(sender=preceding-sibling::message/sender)])"/></strong></span>
      </div>

      <table class="xslt-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Sender</th>
            <th>Receiver</th>
            <th>Content</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          <!-- xsl:sort: newest messages first -->
          <xsl:for-each select="message">
            <xsl:sort select="timestamp" order="descending"/>
            <tr>
              <!-- xsl:attribute: alternate row shading -->
              <xsl:attribute name="class">
                <xsl:choose>
                  <xsl:when test="position() mod 2 = 0">row-even</xsl:when>
                  <xsl:otherwise>row-odd</xsl:otherwise>
                </xsl:choose>
              </xsl:attribute>
              <td><xsl:value-of select="@id"/></td>
              <td><strong><xsl:value-of select="sender"/></strong></td>
              <td><xsl:value-of select="receiver"/></td>
              <td>
                <!-- xsl:if: truncate long messages -->
                <xsl:if test="string-length(content) &gt; 60">
                  <xsl:value-of select="substring(content, 1, 60)"/>...
                </xsl:if>
                <xsl:if test="string-length(content) &lt;= 60">
                  <xsl:value-of select="content"/>
                </xsl:if>
              </td>
              <td><xsl:value-of select="timestamp"/></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </div>
  </xsl:template>

</xsl:stylesheet>
